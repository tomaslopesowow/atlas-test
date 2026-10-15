import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type ExecutionContext, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HasRole } from './decorators/rbac.decorator.js';
import { PermissionEntity } from './entities/permission.entity.js';
import { RoleEntity } from './entities/role.entity.js';
import { RoleAttachmentEntity } from './entities/role-attachment.entity.js';
import { RbacGuard } from './guards/rbac.guard.js';
import { RbacModule } from './rbac.module.js';
import type { ModelRef } from './types/types.js';

@Injectable()
class SessionGuard extends RbacGuard {
    protected getSubject(): ModelRef {
        return { modelType: 'user', modelId: 5 };
    }
}

@HasRole('admin')
class Admin {
    list() {}
}

@Module({ imports: [RbacModule], providers: [SessionGuard] })
class AccountsModule {}

/** The app's side of the contract: a database behind the three repositories, where user 5 is an admin. */
const compile = () =>
    Test.createTestingModule({ imports: [AccountsModule] })
        .overrideProvider(getRepositoryToken(RoleEntity))
        .useValue({ exists: async () => true })
        .overrideProvider(getRepositoryToken(PermissionEntity))
        .useValue({})
        .overrideProvider(getRepositoryToken(RoleAttachmentEntity))
        .useValue({})
        .compile();

describe('RbacModule', () => {
    it('injects what RbacGuard needs into a guard that extends it', async () => {
        const guard = (await compile()).get(SessionGuard);
        const context = {
            getClass: () => Admin,
            getHandler: () => Admin.prototype.list,
        } as unknown as ExecutionContext;

        assert.equal(
            await guard.canActivate(context),
            true,
            'Reflector and RbacService are resolved from design:paramtypes, which `import type` erases',
        );
    });
});
