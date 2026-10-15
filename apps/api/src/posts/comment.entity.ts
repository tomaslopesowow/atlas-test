import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { UserEntity } from '../users/user.entity.js';
import { PostEntity } from './post.entity.js';

@Entity('comment')
export class CommentEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column('int')
    postId!: number;

    @ManyToOne(
        () => PostEntity,
        (post) => post.comments,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'postId' })
    post?: Relation<PostEntity>;

    // what deleting a user cascades through
    @Index()
    @Column('int')
    authorId!: number;

    @ManyToOne(
        () => UserEntity,
        (user) => user.comments,
        {
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'authorId' })
    author?: Relation<UserEntity>;

    @Column('text')
    body!: string;

    // what the dashboard's metrics and the newest-first lists read
    @Index()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
