import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '@repo/media';
import { NotificationsModule } from '@repo/notifications';
import { RbacModule } from '@repo/rbac';
import { MeController } from './me.controller.js';
import { UserEntity } from './user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        MediaModule,
        NotificationsModule,
        RbacModule,
    ],
    controllers: [MeController, UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
