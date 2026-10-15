import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity.js';
import { RoleEntity } from './entities/role.entity.js';
import { RoleAttachmentEntity } from './entities/role-attachment.entity.js';
import { RbacService } from './rbac.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            RoleEntity,
            PermissionEntity,
            RoleAttachmentEntity,
        ]),
    ],
    providers: [RbacService],
    exports: [RbacService],
})
export class RbacModule {}
