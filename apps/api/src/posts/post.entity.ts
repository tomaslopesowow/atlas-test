import { Media } from '@repo/media';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
    UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity.js';

@Entity('post')
export class PostEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column('int')
    authorId!: number;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'authorId' })
    author?: Relation<UserEntity>;

    @Column('text')
    body!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @Media({
        conversions: {
            thumb: { width: 320, height: 320, fit: 'cover', format: 'webp' },
            large: { width: 1280, fit: 'inside', format: 'webp', quality: 80 },
        },
    })
    images?: never;
}
