import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import {
    appConfig,
    type DatabaseConfig,
    databaseConfig,
} from './config/app.config.js';
import { InboxModule } from './inbox/inbox.module.js';
import { PostsModule } from './posts/posts.module.js';
import { RolesModule } from './roles/roles.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, databaseConfig],
        }),

        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (database: DatabaseConfig) => ({
                type: 'postgres',
                ...database,
                autoLoadEntities: true,
                // TODO: migrations before this runs anywhere but locally
                synchronize: true,
            }),
        }),

        AuthModule,
        UsersModule,
        PostsModule,
        InboxModule,
        RolesModule,
    ],
})
export class AppModule {}
