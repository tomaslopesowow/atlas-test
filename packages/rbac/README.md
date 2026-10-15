# @repo/rbac

Roles and permissions for NestJS + TypeORM (Postgres). A role holds permissions and is attached to any model, such as a user. Routes declare what they need with `@HasRole()` and `@HasPermission()`, and a guard you extend checks it.

## Setup

```ts
import { RbacModule } from '@repo/rbac';

@Module({
    imports: [
        TypeOrmModule.forRoot({ /* ... */ autoLoadEntities: true }),
        RbacModule,
    ],
})
export class AppModule {}
```

The tables are `role`, `permission`, `role_permission` and `role_attachment`. The TypeORM CLI doesn't see `autoLoadEntities`, so list `RBAC_ENTITIES` in the data source your migrations are generated from:

```ts
import { RBAC_ENTITIES } from '@repo/rbac';

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [...RBAC_ENTITIES, UserEntity],
    migrations: ['src/migrations/*.ts'],
});
```

## The guard

Extend `RbacGuard` and say who the request is for. Register it as a global guard, in a module that imports `RbacModule`:

```ts
import { type ExecutionContext, Injectable, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { type ModelRef, RbacGuard, RbacModule } from '@repo/rbac';

@Injectable()
export class RolesGuard extends RbacGuard {
    protected getSubject(context: ExecutionContext): ModelRef | undefined {
        const { user } = context.switchToHttp().getRequest();

        return user && { modelType: 'user', modelId: user.id };
    }
}

@Module({
    imports: [RbacModule],
    providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AuthModule {}
```

- A route without `@HasRole()` or `@HasPermission()` passes, and `getSubject()` isn't called for it.
- If `getSubject()` returns `undefined` on a protected route, the request gets a 401. A failed check gets a 403.

If `request.user` comes from your own authentication, do both in one guard, so the role check can never run before sign-in: authenticate, then hand over to `super.canActivate()`.

```ts
@Injectable()
export class AuthGuard extends RbacGuard {
    constructor(
        // not `reflector`: RbacGuard keeps that name private
        private readonly metadata: Reflector,

        rbacService: RbacService,

        private readonly authService: AuthService,
    ) {
        super(metadata, rbacService);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.metadata.getAllAndOverride<boolean>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<AuthRequest>();
        const [, token] = BEARER.exec(request.header('authorization') ?? '') ?? [];
        const userId = token ? await this.authService.authenticate({ token }) : undefined;

        if (!token || !userId) throw new UnauthorizedException();

        request.user = { id: userId, token };

        return super.canActivate(context);
    }

    protected getSubject(context: ExecutionContext): ModelRef | undefined {
        const { user } = context.switchToHttp().getRequest<AuthRequest>();

        return user && { modelType: 'user', modelId: user.id };
    }
}
```

Import `Reflector` and `RbacService` as values, not with `import type`: Nest injects them by the types the compiler emits, and `import type` erases those.

## Declaring what a route needs

```ts
@Controller('posts')
@HasRole('admin', 'editor')
export class PostsController {
    @Get()
    list() {} // admin or editor

    @Delete(':id')
    @HasPermission('delete:posts', 'delete:comments')
    remove() {} // admin or editor, holding both permissions

    @Patch(':id')
    @HasRole('editor')
    update() {} // editor only
}
```

- `@HasRole()` passes with **any** of the roles. `@HasPermission()` passes with **every** permission, held through any of the model's roles.
- A handler's list replaces the controller's for the same decorator, it doesn't merge with it. Roles and permissions are separate: the controller's `@HasRole()` still applies to a handler that only declares `@HasPermission()`, and then both must pass.
- Both throw at startup when called without arguments, as an empty list would replace the controller's and leave the route open.

## Permission names

A permission is `action:thing`: `read:posts`, `send:announcements`, `export:reports.csv`, `read:posts:own`. The action can be any word. Names may hold lowercase letters, digits, `_`, `.` and `-`. They are trimmed and lowercased everywhere, so `Read:Posts` is `read:posts`; role names are too. A malformed name is refused with a 400, and the `PermissionName` type catches a missing colon at compile time.

## Seeding roles

`ensureRole()` creates the role, or gives it the permissions it lacks. It never takes permissions away, and is safe to run on every boot, by several instances at once.

```ts
export const ROLES: Record<string, PermissionName[]> = {
    admin: ['delete:posts', 'delete:comments', 'read:roles', 'update:roles'],
    moderator: ['delete:posts', 'delete:comments'],
};

@Injectable()
export class RolesSeeder implements OnApplicationBootstrap {
    constructor(private readonly rbacService: RbacService) {}

    async onApplicationBootstrap(): Promise<void> {
        for (const [name, permissions] of Object.entries(ROLES))
            await this.rbacService.ensureRole({ name, permissions });
    }
}
```

## Attaching roles and checking

```ts
constructor(private readonly rbacService: RbacService) {}

const user = { modelType: 'user', modelId: 5 };
const { id: roleId } = await this.rbacService.findRoleByName({ name: 'admin' });

await this.rbacService.attachRole({ ...user, roleId });
await this.rbacService.detachRole({ ...user, roleId });

await this.rbacService.rolesOf(user); // with their permissions
await this.rbacService.hasAnyRole({ ...user, names: ['admin', 'editor'] });
await this.rbacService.hasAllPermissions({ ...user, names: ['delete:posts'] });
```

- `attachRole()` refuses a role that is attached already with a 409, and a missing role or model with a 404.
- The rest of `RbacService` manages roles and permissions: `createRole`, `listRoles`, `deleteRole`, `addPermissions`, `removePermissions`, `removeAllPermissions`, `createPermissions`, `deletePermissionsById` and `deletePermissionsByName`. Deleting a role drops its attachments; its permissions stay.
- For controllers, use `RoleInput`, `PermissionsInput` and `RoleAttachmentInput` to validate input, and `RoleOutput`, `PermissionOutput` and `RoleAttachmentOutput` for responses.

## Models

`modelType` is the entity's **table name**: `@Entity('user')` is `'user'`. A role attachment has no foreign key to the model, so `attachRole()` looks up the entity registered under that table and checks the row exists. An unknown `modelType` gets a 400.

## Deleting a model

Without a foreign key, nothing removes a model's attachments when the model goes. Call `deleteForModel()` when you delete it; it resolves with how many went.

```ts
await this.rbacService.deleteForModel({ modelType: 'user', modelId: user.id });
await this.userRepository.delete({ id: user.id });
```

## Tests

The specs are unit tests with stubbed repositories, so they need no database. From `packages/rbac`:

```sh
rm -rf .test-dist && ./node_modules/.bin/tsc -p tsconfig.test.json && node --enable-source-maps --test ".test-dist/**/*.spec.js"
```
