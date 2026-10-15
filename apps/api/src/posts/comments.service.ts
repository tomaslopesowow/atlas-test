import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationService } from '@repo/notifications';
import { RbacService } from '@repo/rbac';
import { MoreThan, Repository } from 'typeorm';
import { userRef } from '../auth/current-user.js';
import { Permission } from '../auth/permissions.js';
import { DEFAULT_PAGE } from '../common/page.query.js';
import { PostCommentedNotification } from '../notifications/post-commented.notification.js';
import type {
    CommentActionInput,
    CommentsOutputInput,
    CommentsPageInput,
    CreateCommentInput,
} from '../types/types.js';
import { UsersService } from '../users/users.service.js';
import { CommentEntity } from './comment.entity.js';
import type { CommentOutput } from './dto/post.output.js';
import { PostsService } from './posts.service.js';

const EXCERPT = 100;

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(CommentEntity)
        private readonly commentRepository: Repository<CommentEntity>,

        private readonly postsService: PostsService,

        private readonly usersService: UsersService,

        private readonly rbacService: RbacService,

        private readonly notificationService: NotificationService,
    ) {}

    /** Comment on a post, telling its author unless they wrote the comment. */
    async create({
        userId,
        postId,
        body,
    }: CreateCommentInput): Promise<CommentOutput> {
        const post = await this.postsService.findEntity({ id: postId });
        const comment = await this.commentRepository.save(
            this.commentRepository.create({ postId, authorId: userId, body }),
        );
        const [output] = await this.toOutputs({ comments: [comment] });

        if (post.authorId !== userId)
            await this.notificationService.send({
                recipients: [userRef(post.authorId)],
                notification: new PostCommentedNotification({
                    postId,
                    commentId: comment.id,
                    name: output?.author.name ?? 'Someone',
                    excerpt: body.slice(0, EXCERPT),
                }),
            });

        // toOutputs gives one output per comment it is given
        return output as CommentOutput;
    }

    /** A post's comments, oldest first, a page at a time. */
    async list({
        postId,
        after,
        limit = DEFAULT_PAGE,
    }: CommentsPageInput): Promise<CommentOutput[]> {
        await this.postsService.findEntity({ id: postId });

        const comments = await this.commentRepository.find({
            where: {
                postId,
                ...(after !== undefined && { id: MoreThan(after) }),
            },
            order: { id: 'ASC' },
            take: limit,
        });

        return this.toOutputs({ comments });
    }

    /** Delete a comment: its author can, the author of the post it is on can, and so can a moderator. */
    async delete({ id, userId }: CommentActionInput): Promise<void> {
        const comment = await this.commentRepository.findOne({
            where: { id },
            relations: { post: true },
        });

        if (!comment) throw new NotFoundException(`No comment with id ${id}`);

        const allowed =
            comment.authorId === userId ||
            comment.post?.authorId === userId ||
            (await this.rbacService.hasAllPermissions({
                subject: userRef(userId),
                names: [Permission.DeleteComments],
            }));

        if (!allowed)
            throw new ForbiddenException(
                'This is not your comment, nor your post',
            );

        await this.commentRepository.delete({ id });
    }

    private async toOutputs({
        comments,
    }: CommentsOutputInput): Promise<CommentOutput[]> {
        const authors = await this.usersService.summaries({
            ids: comments.map(({ authorId }) => authorId),
        });

        return comments.map((comment) => ({
            id: comment.id,
            postId: comment.postId,
            author: authors.get(comment.authorId) ?? {
                id: comment.authorId,
                name: '',
                avatar: null,
            },
            body: comment.body,
            createdAt: comment.createdAt,
        }));
    }
}
