import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { AdminActivityEntity } from '../activity/activity.entity.js';

export enum PostStatus {
    Draft = 'draft',
    Published = 'published',
}

@Entity('author')
export class AuthorEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column('varchar', { nullable: true })
    passwordHash!: string | null;

    @Column('varchar', { nullable: true })
    avatar!: string | null;

    @OneToMany(
        () => PostEntity,
        (post) => post.author,
    )
    posts!: Relation<PostEntity>[];
}

@Entity('blog_post')
export class PostEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 200 })
    title!: string;

    @Column('text', { nullable: true })
    body!: string | null;

    @Column({ type: 'enum', enum: PostStatus, default: PostStatus.Draft })
    status!: PostStatus;

    @Column({ default: 0 })
    views!: number;

    @Column({ default: false })
    featured!: boolean;

    @Column({ type: 'date', nullable: true })
    publishOn!: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    publishedAt!: Date | null;

    @Column('jsonb', { default: {} })
    meta!: object;

    @Column('varchar', { select: false, nullable: true })
    internalNotes!: string | null;

    @Column({ type: 'uuid', nullable: true })
    externalId!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @ManyToOne(
        () => AuthorEntity,
        (author) => author.posts,
        { nullable: true, onDelete: 'RESTRICT' },
    )
    author!: Relation<AuthorEntity> | null;

    @ManyToMany(
        () => TagEntity,
        (tag) => tag.posts,
    )
    @JoinTable({ name: 'post_tag' })
    tags!: Relation<TagEntity>[];
}

@Entity('tag')
export class TagEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column()
    label!: string;

    @Column('varchar', { nullable: true })
    color!: string | null;

    @ManyToMany(
        () => PostEntity,
        (post) => post.tags,
    )
    posts!: Relation<PostEntity>[];
}

@Entity('comment')
export class CommentEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    body!: string;

    // its foreign key declared beside the relation, as TypeORM lets an entity read it without a join
    @Column()
    postId!: number;

    @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post!: Relation<PostEntity>;
}

@Entity('note')
export class NoteEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    text!: string;

    @DeleteDateColumn({ type: 'timestamptz' })
    deletedAt!: Date | null;
}

export const ENTITIES = [
    AuthorEntity,
    PostEntity,
    TagEntity,
    CommentEntity,
    NoteEntity,
    AdminActivityEntity,
];
