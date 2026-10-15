import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
    Unique,
} from 'typeorm';
import { MediaEntity } from './media.entity.js';

@Entity('media_attachment')
// the model first, so the same index also finds the media of a model
@Unique(['modelType', 'modelId', 'media'])
export class MediaAttachmentEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(
        () => MediaEntity,
        (media) => media.attachments,
        { onDelete: 'CASCADE' },
    )
    @JoinColumn({ name: 'mediaId' })
    // the unique index leads with the model, so without this, deleting a media scans every attachment for its own
    @Index()
    // Relation<> keeps the class out of the emitted design:type, which the import cycle can't handle
    media?: Relation<MediaEntity>;

    @Column()
    modelType!: string;

    @Column()
    modelId!: number;
}
