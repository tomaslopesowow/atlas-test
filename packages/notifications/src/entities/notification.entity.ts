import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryColumn,
} from 'typeorm';
import type { Deliveries, NotificationOwner } from '../types/types.js';

@Entity('notification')
// owner, then the id, which sorts by time, so the inbox pages newest first from the index alone
@Index(['modelType', 'modelId', 'id'], { where: '"inbox"' })
export class NotificationEntity {
    // a UUIDv7 made by the service, so the messages can carry it before the row is written
    @PrimaryColumn('uuid')
    id!: string;

    @Column('varchar', { nullable: true })
    modelType!: string | null;

    @Column('int', { nullable: true })
    modelId!: number | null;

    @Column()
    type!: string;

    @Column('jsonb')
    payload!: object;

    /** Whether the owner sees it in their inbox: it listed the database channel, and has an owner. */
    @Column({ default: false })
    inbox!: boolean;

    @Column('timestamptz', { nullable: true })
    readAt!: Date | null;

    @Column('jsonb', { default: {} })
    deliveries!: Deliveries;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    /** Undefined for a notification sent by address alone. */
    get owner(): NotificationOwner | undefined {
        return this.modelType != null && this.modelId != null
            ? { modelType: this.modelType, modelId: this.modelId }
            : undefined;
    }
}
