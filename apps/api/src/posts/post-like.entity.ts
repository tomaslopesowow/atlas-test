import {
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    type Relation,
} from 'typeorm';
import { UserEntity } from '../users/user.entity.js';
import { PostEntity } from './post.entity.js';

/** A user liking a post, at most once: the key is the pair. */
@Entity('post_like')
export class PostLikeEntity {
    @PrimaryColumn('int')
    postId!: number;

    // the key starts with the post, so finding what a user liked needs its own index
    @Index()
    @PrimaryColumn('int')
    userId!: number;

    @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post?: Relation<PostEntity>;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user?: Relation<UserEntity>;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
