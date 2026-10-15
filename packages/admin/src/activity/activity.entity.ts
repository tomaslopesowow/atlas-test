import type { ActivityEvent } from '@repo/admin-contract';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

/** One change made through the admin panel; never changed or deleted by it. */
@Entity('admin_activity')
// a record's history, newest first, from the index alone
@Index(['resource', 'recordKey', 'id'])
export class AdminActivityEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    resource!: string;

    @Column()
    recordKey!: string;

    @Column()
    recordTitle!: string;

    @Column('varchar')
    event!: ActivityEvent;

    @Column('varchar', { nullable: true })
    action!: string | null;

    @Column('jsonb', { default: {} })
    changes!: Record<string, unknown>;

    @Column('jsonb', { nullable: true })
    actor!: unknown;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
