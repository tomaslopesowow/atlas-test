import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { MediaConfig } from '../media.config.js';
import { ConversionStatus, type Conversions } from '../types/types.js';
import { MediaAttachmentEntity } from './media-attachment.entity.js';

/** A row with a conversion still to do; the sweep repeats it word for word, so Postgres can use the index it defines. */
export const hasUnfinishedConversion = (column: string) =>
    `${column} @? '$.* ? (@.status == "${ConversionStatus.Pending}" || @.status == "${ConversionStatus.Processing}")'`;

@Entity('media')
// what the sweep reads, oldest first, without scanning the media whose conversions are all finished
@Index(['createdAt'], { where: hasUnfinishedConversion('"conversions"') })
export class MediaEntity {
    // a UUIDv7 made by the service, since the file is stored under it before the row exists
    @PrimaryColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column()
    fileName!: string;

    @Column()
    collectionName!: string;

    @Column()
    mimeType!: string;

    @Column('varchar')
    disk!: MediaConfig['disk'];

    @Column()
    size!: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;

    // inserts cascade so an upload saves the media and its attachment in one transaction
    @OneToMany(
        () => MediaAttachmentEntity,
        (attachment) => attachment.media,
        { cascade: ['insert'] },
    )
    attachments?: MediaAttachmentEntity[];

    @Column('jsonb', { default: {} })
    conversions!: Conversions;

    /** `user.avatar/019402f1-…`, which holds the original and every conversion. */
    get directory(): string {
        return `${this.collectionName}/${this.id}`;
    }
}
