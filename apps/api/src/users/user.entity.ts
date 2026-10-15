import { Media } from '@repo/media';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    type Relation,
    UpdateDateColumn,
} from 'typeorm';
import { CommentEntity } from '../posts/comment.entity.js';
import { PostEntity } from '../posts/post.entity.js';

// the table name is the modelType media, roles and notifications refer to a user by
@Entity('user')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column('varchar', { unique: true })
    email!: string;

    // never loaded unless asked for, so no query can leak it into an output
    @Column('varchar', { select: false })
    passwordHash!: string;

    @Column('varchar', { length: 50 })
    name!: string;

    // what the dashboard's metrics and the newest-first lists read
    @Index()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    // inverse sides only, no columns: they let the admin panel list a user's posts and comments
    @OneToMany(
        () => PostEntity,
        (post) => post.author,
    )
    posts?: Relation<PostEntity>[];

    @OneToMany(
        () => CommentEntity,
        (comment) => comment.author,
    )
    comments?: Relation<CommentEntity>[];

    @Media({
        single: true,
        conversions: {
            thumb: { width: 96, height: 96, fit: 'cover', format: 'webp' },
            medium: { width: 400, height: 400, fit: 'cover', format: 'webp' },
        },
    })
    avatar?: never;
}
