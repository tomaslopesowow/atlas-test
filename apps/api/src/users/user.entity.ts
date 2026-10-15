import { Media } from '@repo/media';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

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

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    @Media({
        single: true,
        conversions: {
            thumb: { width: 96, height: 96, fit: 'cover', format: 'webp' },
            medium: { width: 400, height: 400, fit: 'cover', format: 'webp' },
        },
    })
    avatar?: never;
}
