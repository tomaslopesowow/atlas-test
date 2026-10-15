import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaService } from '@repo/media';
import { NotificationService } from '@repo/notifications';
import { RbacService } from '@repo/rbac';
import { In, LessThan, Repository } from 'typeorm';
import { userRef } from '../auth/current-user.js';
import { Permission } from '../auth/permissions.js';
import { DEFAULT_PAGE } from '../common/page.query.js';
import { FOREIGN_KEY_VIOLATION, postgresCode } from '../common/postgres.js';
import { PostLikedNotification } from '../notifications/post-liked.notification.js';
import type {
    AuthorCheckInput,
    CountsInput,
    CreatePostInput,
    FeedInput,
    FindPostInput,
    IdInput,
    PostActionInput,
    PostImageIdInput,
    PostImageInput,
    PostStatusChangeInput,
    PostsOutputInput,
    UpdatePostInput,
    ViewPostInput,
} from '../types/types.js';
import { UsersService } from '../users/users.service.js';
import { CommentEntity } from './comment.entity.js';
import type {
    LikeOutput,
    PostImageOutput,
    PostOutput,
} from './dto/post.output.js';
import { PostEntity, PostStatus, postRef } from './post.entity.js';
import { PostLikeEntity } from './post-like.entity.js';

const IMAGES = 'images';

export const MAX_IMAGES = 4;

@Injectable()
export class PostsService {
    private readonly logger = new Logger(PostsService.name);

    constructor(
        @InjectRepository(PostEntity)
        private readonly postRepository: Repository<PostEntity>,

        @InjectRepository(PostLikeEntity)
        private readonly likeRepository: Repository<PostLikeEntity>,

        @InjectRepository(CommentEntity)
        private readonly commentRepository: Repository<CommentEntity>,

        private readonly mediaService: MediaService,

        private readonly rbacService: RbacService,

        private readonly notificationService: NotificationService,

        private readonly usersService: UsersService,
    ) {}

    /** Publish a post; its images are added to it afterwards, one request each. */
    async create({ userId, body }: CreatePostInput): Promise<PostOutput> {
        const post = await this.postRepository.save(
            this.postRepository.create({ authorId: userId, body }),
        );

        return this.findOne({ viewerId: userId, id: post.id });
    }

    /** Posts newest first, everyone's or one author's, a page at a time. */
    async feed({
        viewerId,
        authorId,
        before,
        limit = DEFAULT_PAGE,
    }: FeedInput): Promise<PostOutput[]> {
        if (authorId !== undefined)
            await this.usersService.assertExists({ id: authorId });

        const where = {
            ...(before !== undefined && { id: LessThan(before) }),
        };
        // disabled posts only for their author
        const posts = await this.postRepository.find({
            where:
                authorId === viewerId
                    ? { ...where, authorId }
                    : [
                          {
                              ...where,
                              ...(authorId !== undefined && { authorId }),
                              status: PostStatus.Active,
                          },
                          ...(authorId === undefined
                              ? [{ ...where, authorId: viewerId }]
                              : []),
                      ],
            order: { id: 'DESC' },
            take: limit,
        });

        return this.toOutputs({ viewerId, posts });
    }

    async findOne({ viewerId, id }: ViewPostInput): Promise<PostOutput> {
        const [post] = await this.toOutputs({
            viewerId,
            posts: [await this.findEntity({ id, viewerId })],
        });

        // toOutputs gives one output per post it is given
        return post as PostOutput;
    }

    /** Change what a post says, by its author only. */
    async update({ id, userId, body }: UpdatePostInput): Promise<PostOutput> {
        this.assertAuthor({ post: await this.findEntity({ id }), userId });
        await this.postRepository.update({ id }, { body });

        return this.findOne({ viewerId: userId, id });
    }

    /** Disable a post, hiding it from everyone but its author, or enable it again; by its author only. */
    async setStatus({
        id,
        userId,
        status,
    }: PostStatusChangeInput): Promise<PostOutput> {
        this.assertAuthor({ post: await this.findEntity({ id }), userId });
        await this.postRepository.update({ id }, { status });

        return this.findOne({ viewerId: userId, id });
    }

    /** Delete a post, by its author or a moderator; its likes and comments go with it, and then its images. */
    async delete({ id, userId }: PostActionInput): Promise<void> {
        await this.assertAuthorOr({
            post: await this.findEntity({ id }),
            userId,
            permission: Permission.DeletePosts,
        });
        await this.remove({ id });
    }

    /** Delete a post with its images, whoever asks, as the admin panel does. */
    async remove({ id }: IdInput): Promise<void> {
        await this.postRepository.delete({ id });

        // the post is gone either way, so a failure here only leaves files behind, which is logged
        await this.mediaService
            .deleteForModel(postRef(id))
            .catch((error) =>
                this.logger.error(
                    `Could not delete the images of post ${id}: ${error}`,
                ),
            );
    }

    /** Add an image to a post, by its author, up to MAX_IMAGES; its sizes are made after the response. */
    async addImage({
        id,
        userId,
        file,
    }: PostImageInput): Promise<PostImageOutput> {
        this.assertAuthor({ post: await this.findEntity({ id }), userId });

        if ((await this.images({ id })).length >= MAX_IMAGES)
            throw new BadRequestException(
                `A post has at most ${MAX_IMAGES} images`,
            );

        const { id: mediaId, urls } = await this.mediaService.uploadAndAttach({
            ...postRef(id),
            collection: IMAGES,
            file,
        });

        return { id: mediaId, urls };
    }

    /** Delete one of a post's images, by its author. */
    async removeImage({
        id,
        userId,
        mediaId,
    }: PostImageIdInput): Promise<void> {
        this.assertAuthor({ post: await this.findEntity({ id }), userId });

        if (!(await this.images({ id })).some((image) => image.id === mediaId))
            throw new NotFoundException(`Post ${id} has no image ${mediaId}`);

        await this.mediaService.delete({ id: mediaId });
    }

    /** Like a post; liking it again changes nothing, and only the first like tells its author. */
    async like({ id, userId }: PostActionInput): Promise<LikeOutput> {
        const post = await this.findEntity({ id, viewerId: userId });
        let liked: boolean;

        try {
            const { raw } = await this.likeRepository
                .createQueryBuilder()
                .insert()
                .values({ postId: id, userId })
                .orIgnore()
                .returning(['postId'])
                .execute();

            liked = (raw as unknown[]).length > 0;
        } catch (error) {
            // deleted between being found and liked
            if (postgresCode(error) === FOREIGN_KEY_VIOLATION)
                throw new NotFoundException(`No post with id ${id}`);

            throw error;
        }

        if (liked && post.authorId !== userId) {
            const liker = (
                await this.usersService.summaries({ ids: [userId] })
            ).get(userId);

            await this.notificationService.send({
                recipients: [userRef(post.authorId)],
                notification: new PostLikedNotification({
                    postId: id,
                    userId,
                    name: liker?.name ?? 'Someone',
                }),
            });
        }

        return this.likeState({ id, userId });
    }

    /** Take a like back; unliking a post one does not like changes nothing. */
    async unlike({ id, userId }: PostActionInput): Promise<LikeOutput> {
        await this.findEntity({ id, viewerId: userId });
        await this.likeRepository.delete({ postId: id, userId });

        return this.likeState({ id, userId });
    }

    /** The post, or a 404; also for someone else's disabled post, when told who is asking. */
    async findEntity({ id, viewerId }: FindPostInput): Promise<PostEntity> {
        const post = await this.postRepository.findOneBy({ id });
        const hidden =
            viewerId !== undefined &&
            post?.status === PostStatus.Disabled &&
            post.authorId !== viewerId;

        if (!post || hidden)
            throw new NotFoundException(`No post with id ${id}`);

        return post;
    }

    /** Refuses anyone but the author, unless they hold the permission. */
    async assertAuthorOr({
        post,
        userId,
        permission,
    }: AuthorCheckInput): Promise<void> {
        if (post.authorId === userId) return;

        if (
            permission &&
            (await this.rbacService.hasAllPermissions({
                ...userRef(userId),
                names: [permission],
            }))
        )
            return;

        throw new ForbiddenException('This is not your post');
    }

    private assertAuthor({ post, userId }: AuthorCheckInput): void {
        if (post.authorId !== userId)
            throw new ForbiddenException('This is not your post');
    }

    private async likeState({
        id,
        userId,
    }: PostActionInput): Promise<LikeOutput> {
        const [likeCount, likedByMe] = await Promise.all([
            this.likeRepository.countBy({ postId: id }),
            this.likeRepository.existsBy({ postId: id, userId }),
        ]);

        return { likeCount, likedByMe };
    }

    // in upload order, which findForModel gives newest first
    private async images({ id }: IdInput): Promise<PostImageOutput[]> {
        const media = await this.mediaService.findForModel({
            ...postRef(id),
            collection: IMAGES,
        });

        return media
            .reverse()
            .map(({ id: mediaId, urls }) => ({ id: mediaId, urls }));
    }

    // a fixed number of queries for the page, then one image lookup per post and avatar lookup per author
    private async toOutputs({
        viewerId,
        posts,
    }: PostsOutputInput): Promise<PostOutput[]> {
        if (posts.length === 0) return [];

        const ids = posts.map(({ id }) => id);
        const [likeCounts, commentCounts, liked, authors, images] =
            await Promise.all([
                this.countsPerPost({ repository: this.likeRepository, ids }),
                this.countsPerPost({ repository: this.commentRepository, ids }),
                this.likeRepository.find({
                    select: { postId: true },
                    where: { userId: viewerId, postId: In(ids) },
                }),
                this.usersService.summaries({
                    ids: posts.map(({ authorId }) => authorId),
                }),
                Promise.all(posts.map(({ id }) => this.images({ id }))),
            ]);
        const likedIds = new Set(liked.map(({ postId }) => postId));

        return posts.map((post, index) => ({
            id: post.id,
            // the foreign key deletes a user's posts with them, so the author is always there
            author: authors.get(post.authorId) ?? {
                id: post.authorId,
                name: '',
                avatar: null,
            },
            body: post.body,
            status: post.status,
            images: images[index] ?? [],
            likeCount: likeCounts.get(post.id) ?? 0,
            commentCount: commentCounts.get(post.id) ?? 0,
            likedByMe: likedIds.has(post.id),
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        }));
    }

    private async countsPerPost({
        repository,
        ids,
    }: CountsInput): Promise<Map<number, number>> {
        const rows: { postId: number; count: number }[] = await repository
            .createQueryBuilder('row')
            .select('row.postId', 'postId')
            .addSelect('COUNT(*)::int', 'count')
            .where('row.postId IN (:...ids)', { ids })
            .groupBy('row.postId')
            .getRawMany();

        return new Map(rows.map(({ postId, count }) => [postId, count]));
    }
}
