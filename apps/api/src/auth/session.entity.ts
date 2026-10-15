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

/** A signed-in device or browser; deleting the row signs it out. */
@Entity('session')
export class SessionEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Index()
    @Column('int')
    userId!: number;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user?: Relation<UserEntity>;

    // the token's SHA-256, so a leaked table signs no one in
    @Column('char', { length: 64, unique: true })
    tokenHash!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @Column('timestamptz')
    expiresAt!: Date;
}
