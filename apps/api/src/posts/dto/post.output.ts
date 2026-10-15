import type { MediaUrlsOutput } from '@repo/media';
import type { UserSummaryOutput } from '../../users/dto/user.output.js';

export class PostImageOutput {
    id!: string;
    urls!: MediaUrlsOutput;
}

export class PostOutput {
    id!: number;
    author!: UserSummaryOutput;
    body!: string;
    images!: PostImageOutput[];
    likeCount!: number;
    commentCount!: number;
    /** Whether the user asking likes it. */
    likedByMe!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
}

export class LikeOutput {
    likeCount!: number;
    likedByMe!: boolean;
}

export class CommentOutput {
    id!: number;
    postId!: number;
    author!: UserSummaryOutput;
    body!: string;
    createdAt!: Date;
}
