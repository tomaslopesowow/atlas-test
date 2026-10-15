import { Module } from '@nestjs/common';
import { NotificationsModule } from '@repo/notifications';
import { RbacModule } from '@repo/rbac';
import { UsersModule } from '../users/users.module.js';
import { RolesController } from './roles.controller.js';
import { RolesSeeder } from './roles.seeder.js';
import { RolesService } from './roles.service.js';

@Module({
    imports: [RbacModule, NotificationsModule, UsersModule],
    controllers: [RolesController],
    providers: [RolesService, RolesSeeder],
})
export class RolesModule {}
