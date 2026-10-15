import { Module } from '@nestjs/common';
import { AdminModule, AdminUiController } from '@repo/admin';
import { RbacModule } from '@repo/rbac';
import { AuthModule } from '../auth/auth.module.js';
import { Public } from '../auth/current-user.js';
import { PostsModule } from '../posts/posts.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminLogin } from './admin-login.js';
import { MainDashboard } from './main.dashboard.js';
import { CommentResource } from './resources/comment.resource.js';
import { PostResource } from './resources/post.resource.js';
import { UserResource } from './resources/user.resource.js';

// the panel's pages and its sign-in are for anyone; the API asks AdminLogin.authorize()
Public()(AdminUiController);

/**
 * The admin panel at /admin and its API under /admin/api: one resource a file in ./resources, as
 * Nova's, the dashboard and the sign-in, each found by the class it extends.
 */
@Module({
    imports: [AdminModule, AuthModule, PostsModule, RbacModule, UsersModule],
    providers: [
        UserResource,
        PostResource,
        CommentResource,
        MainDashboard,
        AdminLogin,
    ],
})
export class AdminPanelModule {}
