import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryColumn,
} from 'typeorm';
import {
    type Deliveries,
    DeliveryStatus,
    type ModelRef,
} from '../types/types.js';

/** A row with a delivery still to make; the sweep repeats it word for word, so Postgres can use the index it defines. */
export const hasUnfinishedDelivery = (column: string) =>
    `${column} @? '$.* ? (@.status == "${DeliveryStatus.Pending}" || @.status == "${DeliveryStatus.Processing}")'`;

@Entity('notification')
// owner, then the id, which sorts by time, so the inbox pages newest first from the index alone
@Index(['modelType', 'modelId', 'id'], { where: '"inbox"' })
// what the unread count and mark-all-read read, rather than every notification the owner ever had
@Index(['modelType', 'modelId'], { where: '"inbox" AND "readAt" IS NULL' })
// what the sweep reads, oldest first, without scanning the notifications whose deliveries are all finished
@Index(['id'], { where: hasUnfinishedDelivery('"deliveries"') })
// every row of an owner, inbox or not, for deleteForModel, which the partial indexes above cannot serve
@Index(['modelType', 'modelId'])
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

    @Column({ type: 'timestamptz', nullable: true })
    readAt!: Date | null;

    @Column('jsonb', { default: {} })
    deliveries!: Deliveries;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    /** Undefined for a notification sent by address alone. */
    get owner(): ModelRef | undefined {
        return this.modelType != null && this.modelId != null
            ? { modelType: this.modelType, modelId: this.modelId }
            : undefined;
    }
}
