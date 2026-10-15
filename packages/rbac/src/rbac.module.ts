import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity.js';
import { RoleEntity } from './entities/role.entity.js';
import { RoleAttachmentEntity } from './entities/role-attachment.entity.js';
import { RbacService } from './rbac.service.js';

/** For an app's migrations data source, as the TypeORM CLI does not see autoLoadEntities. */
export const RBAC_ENTITIES = [
    RoleEntity,
    PermissionEntity,
    RoleAttachmentEntity,
];

@Module({
    imports: [TypeOrmModule.forFeature(RBAC_ENTITIES)],
    providers: [RbacService],
    exports: [RbacService],
})
export class RbacModule {}
