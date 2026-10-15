import { Media } from '@repo/media';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    type Relation,
    UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity.js';
import { CommentEntity } from './comment.entity.js';

/** Whether a post shows; its author can disable it, and enable it again. */
export enum PostStatus {
    Active = 'active',
    Disabled = 'disabled',
}

@Entity('post')
export class PostEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column('int')
    authorId!: number;

    @ManyToOne(
        () => UserEntity,
        (user) => user.posts,
        { onDelete: 'CASCADE' },
    )
    @JoinColumn({ name: 'authorId' })
    author?: Relation<UserEntity>;

    @Column('text')
    body!: string;

    // shown to its author only while disabled, as if deleted for everyone else
    @Column({ type: 'enum', enum: PostStatus, default: PostStatus.Active })
    status!: PostStatus;

    // what the dashboard's metrics and the newest-first lists read
    @Index()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @OneToMany(
        () => CommentEntity,
        (comment) => comment.post,
    )
    comments?: Relation<CommentEntity>[];

    @Media({
        conversions: {
            thumb: { width: 320, height: 320, fit: 'cover', format: 'webp' },
            large: { width: 1280, fit: 'inside', format: 'webp', quality: 80 },
        },
    })
    images?: never;
}

/** A post as the packages refer to it, by its table and id. */
export const postRef = (id: number) => ({ modelType: 'post', modelId: id });
