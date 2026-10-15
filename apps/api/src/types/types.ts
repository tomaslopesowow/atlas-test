import type { MediaUrlsOutput } from '@repo/media';
import type { ObjectLiteral, Repository } from 'typeorm';
import type { CommentEntity } from '../posts/comment.entity.js';
import type { PostEntity, PostStatus } from '../posts/post.entity.js';
import type { UserEntity } from '../users/user.entity.js';

export interface IdInput {
    id: number;
}

export interface IdsInput {
    ids: number[];
}

export interface EmailInput {
    email: string;
}

export interface TokenInput {
    token: string;
}

export interface UserIdInput {
    userId: number;
}

// ---------- users

export interface CreateUserInput extends EmailInput {
    /** Already hashed; the plain password never reaches the users service. */
    passwordHash: string;
    name: string;
}

export interface UserCredentials {
    id: number;
    passwordHash: string;
}

export interface UpdateUserInput extends IdInput {
    name: string;
}

export interface SetAvatarInput extends IdInput {
    file: Express.Multer.File;
}

export interface UserEntityInput {
    user: UserEntity;
}

export interface SummaryInput extends UserEntityInput {
    avatar: MediaUrlsOutput | null;
}

// ---------- posts

/** Something a user does to a post, who may have to be its author. */
export interface PostActionInput extends IdInput {
    userId: number;
}

export interface CreatePostInput {
    userId: number;
    body: string;
}

export interface UpdatePostInput extends PostActionInput {
    body: string;
}

export interface PostStatusChangeInput extends PostActionInput {
    status: PostStatus;
}

export interface FindPostInput extends IdInput {
    /** Who is asking: someone else's disabled post is then missing. */
    viewerId?: number;
}

export interface PostImageInput extends PostActionInput {
    file: Express.Multer.File;
}

export interface PostImageIdInput extends PostActionInput {
    mediaId: string;
}

/** A page of posts, newest first, as one user sees them. */
export interface FeedInput {
    viewerId: number;
    authorId?: number;
    before?: number;
    limit?: number;
}

export interface ViewPostInput extends IdInput {
    viewerId: number;
}

export interface PostsOutputInput {
    viewerId: number;
    posts: PostEntity[];
}

/** A table with a postId, counted per post. */
export interface CountsInput {
    repository: Repository<ObjectLiteral & { postId: number }>;
    ids: number[];
}

export interface AuthorCheckInput {
    post: PostEntity;
    userId: number;
    /** A permission that lets someone other than the author do it too. */
    permission?: string;
}

// ---------- comments

export interface CreateCommentInput {
    userId: number;
    postId: number;
    body: string;
}

export interface CommentsPageInput {
    viewerId: number;
    postId: number;
    after?: number;
    limit?: number;
}

export interface CommentsOutputInput {
    comments: CommentEntity[];
}

export interface CommentActionInput extends IdInput {
    userId: number;
}

// ---------- roles

export interface AdminAccountInput extends EmailInput {
    password?: string;
}

export interface GrantRoleInput {
    userId: number;
    roleId: number;
}
