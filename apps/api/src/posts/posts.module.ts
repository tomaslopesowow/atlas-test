import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '@repo/media';
import { NotificationsModule } from '@repo/notifications';
import { RbacModule } from '@repo/rbac';
import { UsersModule } from '../users/users.module.js';
import { CommentEntity } from './comment.entity.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { PostEntity } from './post.entity.js';
import { PostLikeEntity } from './post-like.entity.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([PostEntity, PostLikeEntity, CommentEntity]),
        MediaModule,
        NotificationsModule,
        RbacModule,
        UsersModule,
    ],
    controllers: [PostsController, CommentsController],
    providers: [PostsService, CommentsService],
    exports: [PostsService],
})
export class PostsModule {}
