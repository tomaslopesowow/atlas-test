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

    @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post?: Relation<PostEntity>;

    @Column('int')
    authorId!: number;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'authorId' })
    author?: Relation<UserEntity>;

    @Column('text')
    body!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
