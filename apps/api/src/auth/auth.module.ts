import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacModule } from '@repo/rbac';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SessionEntity } from './session.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([SessionEntity]),
        RbacModule,
        UsersModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
    exports: [AuthService],
})
export class AuthModule {}
