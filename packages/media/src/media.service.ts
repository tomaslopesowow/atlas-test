import { randomUUIDv7 } from 'node:crypto';
import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import {
    ConversionWorker,
    pendingConversions,
} from './conversion/conversion.worker.js';
import { getMediaCollection } from './decorators/media.decorator.js';
import { type MediaOutput, toMediaOutput } from './dto/media.output.js';
import type { MediaAttachmentInput } from './dto/media-attachment.input.js';
import type { MediaAttachmentOutput } from './dto/media-attachment.output.js';
import type { MediaUploadInput } from './dto/media-upload.input.js';
import type { MediaUploadAndAttachInput } from './dto/media-upload-and-attach.input.js';
import type { MediaUrlsOutput } from './dto/media-urls.output.js';
import { MediaEntity } from './entities/media.entity.js';
import { MediaAttachmentEntity } from './entities/media-attachment.entity.js';
import {
    type IStorageService,
    STORAGE_SERVICE,
} from './storage/storage.interface.js';
import {
    ConversionStatus,
    type FindForModelInput,
    type KeepNewestInput,
    type MediaIdInput,
    type ModelRef,
    ORIGINAL_NAME,
    type ReleaseInput,
    type ReleaseOutput,
    StoreInput,
    type WithFile,
} from './types/types.js';
import { extensionFor } from './utils.js';

// one path segment, since an orphan's collection comes from the client and names its directory
const COLLECTION_NAME = /^[a-z0-9][\w.-]*$/i;

const postgresCode = (error: unknown) =>
    error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;

// raised for the request that loses a race to attach
const UNIQUE_VIOLATION = '23505';

// raised for an attach whose media was deleted after it was found
const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);

    constructor(
        @InjectRepository(MediaEntity)
        private readonly mediaRepository: Repository<MediaEntity>,

        @InjectRepository(MediaAttachmentEntity)
        private readonly mediaAttachmentRepository: Repository<MediaAttachmentEntity>,

        private readonly conversionWorker: ConversionWorker,

        @Inject(STORAGE_SERVICE)
        private readonly storageService: IStorageService,
    ) {}

    /** Store a file in a collection of its own, attached to no model. */
    async upload({
        file,
        collectionName,
    }: WithFile<MediaUploadInput>): Promise<MediaOutput> {
        if (!collectionName)
            throw new BadRequestException('Provide a collection');
        if (!COLLECTION_NAME.test(collectionName))
            throw new BadRequestException(
                'A collection is letters, digits, "_", "-" and ".", starting with a letter or digit',
            );

        return this.toOutput(await this.store({ file, collectionName }));
    }

    /** Store a file in a model's @Media() collection and attach it, converting in the background; in a single collection, it replaces what was there. */
    async uploadAndAttach({
        file,
        modelType,
        modelId,
        collection,
    }: WithFile<MediaUploadAndAttachInput>): Promise<MediaOutput> {
        const mediaCollection = getMediaCollection(
            await this.findModelClass({ modelType, modelId }),
            collection,
        );

        if (!mediaCollection)
            throw new BadRequestException(
                `${modelType} has no @Media() collection "${collection}"`,
            );

        const collectionName = `${modelType}.${collection}`;
        const media = await this.store({
            file,
            collectionName,
            conversions: pendingConversions(mediaCollection.conversions ?? {}),
            attachments: [{ modelType, modelId }],
        });

        // the original is safe, so the rest happens after the response
        void this.conversionWorker.run({ media, original: file.buffer });

        if (mediaCollection.single)
            await this.keepNewest({ collectionName, modelType, modelId });

        return this.toOutput(media);
    }

    /** Attach an existing media to a model. */
    async attach({
        mediaId,
        modelType,
        modelId,
    }: MediaAttachmentInput): Promise<MediaAttachmentOutput> {
        await this.findModelClass({ modelType, modelId });

        const media = await this.findMedia({ id: mediaId });

        try {
            await this.mediaAttachmentRepository.insert({
                media,
                modelType,
                modelId,
            });
        } catch (error) {
            if (postgresCode(error) === UNIQUE_VIOLATION)
                throw new ConflictException(
                    `Media ${mediaId} is already attached to ${modelType} ${modelId}`,
                );
            if (postgresCode(error) === FOREIGN_KEY_VIOLATION)
                throw new NotFoundException(`No media with id ${mediaId}`);

            throw error;
        }

        return { media: this.toOutput(media), modelType, modelId };
    }

    /** Detach a media from a model, keeping the media and its files. */
    async detach({
        mediaId,
        modelType,
        modelId,
    }: MediaAttachmentInput): Promise<void> {
        await this.findMedia({ id: mediaId });

        const { affected } = await this.mediaAttachmentRepository.delete({
            media: { id: mediaId },
            modelType,
            modelId,
        });

        if (!affected)
            throw new NotFoundException(
                `Media ${mediaId} is not attached to ${modelType} ${modelId}`,
            );
    }

    /** Delete a media and its files; the database drops its attachments. */
    async delete({ id }: MediaIdInput): Promise<void> {
        const { directory } = await this.findMedia({ id });

        await this.mediaRepository.delete({ id });
        await this.storageService.deletePrefix({ prefix: directory });
    }

    /** Let a model go of all its media, as when it is deleted: what only it had is deleted, the rest detached. */
    async deleteForModel({
        modelType,
        modelId,
    }: ModelRef): Promise<ReleaseOutput> {
        const media = await this.mediaRepository.find({
            select: { id: true },
            where: { attachments: { modelType, modelId } },
        });

        return this.release({
            modelType,
            modelId,
            mediaIds: media.map(({ id }) => id),
        });
    }

    /** The media attached to a model, newest first, or only those uploaded into one of its collections. */
    async findForModel({
        modelType,
        modelId,
        collection,
    }: FindForModelInput): Promise<MediaOutput[]> {
        const media = await this.mediaRepository.find({
            where: {
                attachments: { modelType, modelId },
                ...(collection !== undefined && {
                    collectionName: `${modelType}.${collection}`,
                }),
            },
            order: { createdAt: 'DESC' },
        });

        return media.map((item) => this.toOutput(item));
    }

    /** The url of the original and of each conversion, which is null until it is done. */
    async findUrls({ id }: MediaIdInput): Promise<MediaUrlsOutput> {
        return this.urlsFor(await this.findMedia({ id }));
    }

    private toOutput(media: MediaEntity): MediaOutput {
        return toMediaOutput(media, this.urlsFor(media));
    }

    private urlsFor(media: MediaEntity): MediaUrlsOutput {
        const url = (fileName: string) =>
            this.storageService.url({ path: `${media.directory}/${fileName}` });

        return {
            original: url(media.fileName),
            conversions: Object.fromEntries(
                Object.entries(media.conversions).map(
                    ([name, { status, fileName }]) => [
                        name,
                        status === ConversionStatus.Done ? url(fileName) : null,
                    ],
                ),
            ),
        };
    }

    // Each upload looks only once its own row is committed, so whichever looks last sees every racing upload
    // and leaves the newest, even when that is not its own. The upload succeeded, so a failure here is only
    // logged: the next upload removes what is left.
    private async keepNewest({
        collectionName,
        modelType,
        modelId,
    }: KeepNewestInput): Promise<void> {
        try {
            const [, ...older] = await this.mediaRepository.find({
                select: { id: true },
                where: { collectionName, attachments: { modelType, modelId } },
                // a UUIDv7 sorts by when it was made
                order: { id: 'DESC' },
            });

            await this.release({
                modelType,
                modelId,
                mediaIds: older.map(({ id }) => id),
            });
        } catch (error) {
            this.logger.error(
                `Could not remove the replaced media in ${collectionName} of ${modelType} ${modelId}: ${error}`,
            );
        }
    }

    // One transaction. The rows are locked first, in id order so two releases cannot deadlock: an attach still
    // committing finishes before the delete decides, and the delete, a new statement, sees its link and only
    // detaches; an attach coming later waits, then finds the media gone.
    private async release({
        modelType,
        modelId,
        mediaIds,
    }: ReleaseInput): Promise<ReleaseOutput> {
        if (mediaIds.length === 0) return { deleted: 0, detached: 0 };

        const { deleted, detached } =
            await this.mediaRepository.manager.transaction(async (manager) => {
                await manager.query(
                    'SELECT 1 FROM "media" WHERE "id" = ANY(CAST($1 AS uuid[])) ORDER BY "id" FOR UPDATE',
                    [mediaIds],
                );

                const { raw } = await manager
                    .createQueryBuilder()
                    .delete()
                    .from(MediaEntity)
                    .where('"id" = ANY(CAST(:ids AS uuid[]))', {
                        ids: mediaIds,
                    })
                    .andWhere(
                        `NOT EXISTS (SELECT 1 FROM "media_attachment" "other" WHERE "other"."mediaId" = "media"."id" AND ("other"."modelType" <> :modelType OR "other"."modelId" <> :modelId))`,
                        { modelType, modelId },
                    )
                    .returning(['id', 'collectionName'])
                    .execute();

                // the deleted media took their attachments with them; what is left is shared
                const { affected } = await manager.delete(
                    MediaAttachmentEntity,
                    {
                        media: { id: In(mediaIds) },
                        modelType,
                        modelId,
                    },
                );

                return {
                    deleted: raw as Pick<
                        MediaEntity,
                        'id' | 'collectionName'
                    >[],
                    detached: affected ?? 0,
                };
            });

        // the rows are gone, so a file left behind is only wasted space, never a broken media
        await Promise.all(
            deleted.map(({ id, collectionName }) =>
                this.storageService
                    .deletePrefix({ prefix: `${collectionName}/${id}` })
                    .catch((error) =>
                        this.logger.error(
                            `Could not delete the files of media ${id}: ${error}`,
                        ),
                    ),
            ),
        );

        return { deleted: deleted.length, detached };
    }

    // the file goes first, so a failed upload or insert can remove what was written and leave nothing behind
    private async store({
        file,
        collectionName,
        conversions = {},
        attachments,
    }: StoreInput): Promise<MediaEntity> {
        if (!file) throw new BadRequestException('Provide a file');

        const extension = extensionFor(file.mimetype);

        if (!extension)
            throw new UnprocessableEntityException(
                `Cannot derive a file extension from the mime type ${file.mimetype}`,
            );

        const media = this.mediaRepository.create({
            id: randomUUIDv7(),
            name: file.originalname,
            fileName: `${ORIGINAL_NAME}.${extension}`,
            collectionName,
            mimeType: file.mimetype,
            size: file.size,
            disk: this.storageService.disk,
            conversions,
            attachments,
        });

        try {
            await this.storageService.put({
                path: `${media.directory}/${media.fileName}`,
                buffer: file.buffer,
                contentType: file.mimetype,
            });

            return await this.mediaRepository.save(media);
        } catch (error) {
            await this.storageService
                .deletePrefix({ prefix: media.directory })
                .catch(() => undefined);
            throw error;
        }
    }

    private async findMedia({ id }: MediaIdInput): Promise<MediaEntity> {
        const media = await this.mediaRepository.findOneBy({ id });

        if (!media) throw new NotFoundException(`No media with id ${id}`);

        return media;
    }

    // polymorphic links have no foreign key, so the model's existence is checked here instead
    private async findModelClass({
        modelType,
        modelId,
    }: ModelRef): Promise<object> {
        const { manager } = this.mediaRepository;
        const metadata = manager.dataSource.entityMetadatas.find(
            ({ tableName }) => tableName === modelType,
        );

        if (!metadata || typeof metadata.target === 'string')
            throw new BadRequestException(
                `No entity is registered for "${modelType}"`,
            );

        if (!(await manager.existsBy(metadata.target, { id: modelId })))
            throw new NotFoundException(`No ${modelType} with id ${modelId}`);

        return metadata.target;
    }
}
