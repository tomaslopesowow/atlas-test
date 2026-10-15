# @repo/rbac: a guide for agents

Roles and permissions for a NestJS app on TypeORM and Postgres. This file is enough to use the package without reading its source: everything listed is public API, and anything else is internal. `README.md` goes deeper. Where the repo has `apps/api`, it shows the package wired into an app.

## Rules

- **Stack:** NestJS 12, TypeORM 1.1 on Postgres, class-validator. The app's tsconfig sets `experimentalDecorators`, `emitDecoratorMetadata` and `useDefineForClassFields: false`, as Nest needs.
- **Independent:** the package imports no other `@repo/*` package. The app combines it with others.
- **No `forRoot()`:** import `RbacModule`. The guard is a class the app extends **and registers** as `APP_GUARD`; nothing finds it by itself.
- **One object parameter** for every service method, even for one value: `rbacService.rolesOf({ modelType: 'user', modelId: 5 })`.
- **A model is a `ModelRef`:** `{ modelType, modelId }`, passed as flat fields in every method input.
  - `modelType` is the entity's **table name** (`@Entity('user')` → `'user'`), and `modelId` its integer `id`.
  - Write one helper per entity, e.g. `const userRef = (id: number) => ({ modelType: 'user', modelId: id })`.
- **No foreign key reaches a role attachment.** When the app deletes a model, call `rbacService.deleteForModel(ref)`.
- **Tables:** `role`, `permission`, `role_permission` and `role_attachment`.
  - They're exported as `RBAC_ENTITIES`, for a data source that lists its entities, as the TypeORM CLI's must.
  - A change to them needs a migration in the app.
- **Consumed from `dist`:** after changing the package, rebuild it with `./node_modules/.bin/tsc -p tsconfig.build.json` in this directory, or keep `pnpm dev` running.

## Protecting routes

Extend `RbacGuard`, say who the request is for, and register it as the global guard:

```ts
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

- `@HasRole('admin', 'editor')` passes with **any** of the roles. `@HasPermission('delete:posts', 'delete:comments')` passes only with **every** permission, held through any of the model's roles.
- A handler's list replaces the controller's for the same decorator. `@HasRole` and `@HasPermission` are checked separately, and both must pass.
- A route with neither decorator passes, and `getSubject()` isn't called for it.
- Either decorator with no arguments throws at startup: an empty list would replace the controller's and leave the route open.
- If `getSubject()` returns `undefined` on a protected route, the request gets a 401. A failed check gets a 403.
- If the app does its own authentication, do both in one guard: authenticate first, then call `super.canActivate(context)`. `apps/api/src/auth/auth.guard.ts` does this. Import `Reflector` and `RbacService` as values, not with `import type`.

## Permission names

A permission name is `action:thing`, e.g. `read:posts`, `send:announcements`, `read:posts:own`.

- **Characters:** lowercase letters, digits, `_`, `.` and `-`. Names are trimmed and lowercased everywhere, role names too.
- **Typing:** `@HasPermission()` takes the `PermissionName` template type, which catches a missing colon at compile time.
- **At runtime:** the service methods take plain strings and refuse a malformed name with a 400. In a seeder, that stops the boot.

## RbacService

| Method | Input | Returns, and errors |
| --- | --- | --- |
| `ensureRole` | `{ name, permissions?: string[] }` | `RoleOutput`. Creates the role, or adds the permissions it lacks, creating any that don't exist. Idempotent, and safe on every boot and concurrently: use it for seeding. |
| `createRole` | `{ name, permissions? }` | `RoleOutput`; 409 if the name exists |
| `listRoles` | — | `RoleOutput[]`, with their permissions |
| `findRoleByName` | `{ name }` | `RoleOutput`; 404 |
| `deleteRole` | `{ roleId }` | `void`. Its attachments and permission links go; the permissions stay. |
| `attachRole` | `{ roleId, modelType, modelId }` | `RoleAttachmentOutput`; 409 if already attached, 404 if the role or model doesn't exist, 400 for an unknown `modelType` |
| `detachRole` | `{ roleId, modelType, modelId }` | `void`; 404 if not attached |
| `rolesOf` | `ModelRef` | `RoleOutput[]` |
| `hasAnyRole` | `ModelRef & { names }` | `boolean`; `false` for no names |
| `hasAllPermissions` | `ModelRef & { names }` | `boolean`; `true` for no names |
| `addPermissions`, `removePermissions` | `{ roleId, names }` | `RoleOutput` |
| `removeAllPermissions` | `{ roleId }` | `number` removed |
| `createPermissions` | `{ names }` | `PermissionOutput[]`; 409 if any exists |
| `deletePermissionsById` | `{ ids }` | `number` deleted |
| `deletePermissionsByName` | `{ names }` | `number` deleted |
| `deleteForModel` | `ModelRef` | `number` of attachments removed. Call it when deleting the model. |

- **DTOs for controllers:** `RoleInput`, `PermissionsInput`, `RoleAttachmentInput`.
- **Outputs:** `RoleOutput { id, name, permissions?: PermissionOutput[] }`, `PermissionOutput { id, name }` and `RoleAttachmentOutput { role, modelType, modelId }`.

## Seeding roles

Keep the roles and their permissions in one constant, and bring them up to date on every boot:

```ts
export const ROLES: Record<string, PermissionName[]> = {
    admin: ['delete:posts', 'read:roles', 'update:roles'],
    moderator: ['delete:posts'],
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

`ensureRole()` never takes a permission away. Remove one with `removePermissions()`.

## In apps/api

- `src/auth/auth.guard.ts`: authentication and rbac in one global guard
- `src/auth/permissions.ts` and `src/roles/roles.seeder.ts`: the roles, seeded on every boot
- `src/roles/roles.controller.ts`: role endpoints
- `src/users/users.service.ts` `delete()`: calls `deleteForModel` when a user goes

## Testing

From this directory:

```sh
./node_modules/.bin/tsc --noEmit -p tsconfig.json && rm -rf .test-dist && ./node_modules/.bin/tsc -p tsconfig.test.json && node --test --test-timeout=60000 ".test-dist/**/*.spec.js"
```

- The specs stub the repositories, so they need no database.
- Lint from the repo root with `./node_modules/.bin/biome check packages/rbac`.
- Prefer these binaries over pnpm scripts, which check, and may reinstall, the whole workspace first.

## Gotchas

- **Nest DI** reads constructor parameter types at runtime. Import injected classes as values, never with `import type`.
- **TypeORM 1.x throws on `undefined` or `null` in a `where`.** Build conditions with spreads, `...(x !== undefined && { x })`, and match SQL NULL with `IsNull()`.
- **`attachRole()` checks that the model exists,** by finding the entity registered under `modelType`. An unknown table is a 400, and a missing row a 404.
