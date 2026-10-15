import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import {
    BadRequestException,
    ConflictException,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import sharp from 'sharp';
import { type DeepPartial, In, QueryFailedError } from 'typeorm';
import { ConversionWorker } from './conversion/conversion.worker.js';
import { Media } from './decorators/media.decorator.js';
import { MediaEntity } from './entities/media.entity.js';
import { MediaAttachmentEntity } from './entities/media-attachment.entity.js';
import { type MediaConfig, mediaConfig } from './media.config.js';
import { MediaService } from './media.service.js';
import {
    STORAGE_SERVICE,
    type StoragePathInput,
    type StoragePrefixInput,
    type StoragePutInput,
} from './storage/storage.interface.js';
import { ConversionStatus } from './types/types.js';

class User {
    @Media({
        conversions: {
            square: { width: 64, height: 64, fit: 'cover' },
            banner: { width: 1200, format: 'jpeg' },
        },
    })
    avatar?: never;

    @Media()
    documents?: never;

    @Media({ single: true, conversions: { small: { width: 32 } } })
    badge?: never;
}

/** An image of this size, in this format, as sharp encodes it. */
const anImage = (
    format: 'png' | 'jpeg' | 'webp' | 'gif',
    width = 4,
    height = 4,
) =>
    sharp({ create: { width, height, channels: 3, background: '#c0ffee' } })
        .toFormat(format)
        .toBuffer();

const png = await anImage('png');
const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>',
);
const MAX_IMAGE_PIXELS = 10_000;

const id = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';
const UUID_V7 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const aMedia = (overrides: Partial<MediaEntity> = {}): MediaEntity =>
    Object.assign(new MediaEntity(), {
        id,
        name: 'holiday.png',
        fileName: 'original.png',
        collectionName: 'user.avatar',
        mimeType: 'image/png',
        disk: 'local',
        size: 2048,
        conversions: {},
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    });

const aFile = (overrides: Partial<Express.Multer.File> = {}) =>
    ({
        fieldname: 'file',
        originalname: 'holiday.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: png,
        ...overrides,
    }) as Express.Multer.File;

const noFile = undefined as unknown as Express.Multer.File;

const upload = { modelType: 'user', modelId: 5, collection: 'avatar' };
const link = { mediaId: id, modelType: 'user', modelId: 5 };

/** The delete that lets a model go of media, as the query builder chain builds it. */
const releaseQuery = {
    where: mock.fn((_sql: string, _parameters: object) => releaseQuery),
    andWhere: mock.fn((_sql: string, _parameters: object) => releaseQuery),
    returning: mock.fn((_columns: string[]) => releaseQuery),
    delete: () => releaseQuery,
    from: (_entity: unknown) => releaseQuery,
    execute: mock.fn(
        async (): Promise<{
            raw: { id: string; collectionName: string }[];
        }> => ({
            raw: [],
        }),
    ),
};

const transactionManager = {
    query: mock.fn(async (_sql: string, _parameters: unknown[]) => []),
    createQueryBuilder: mock.fn(() => releaseQuery),
    delete: mock.fn(async (_entity: unknown, _criteria: unknown) => ({
        affected: 0,
    })),
};

const manager = {
    transaction: mock.fn(
        async <T>(work: (inner: typeof transactionManager) => Promise<T>) =>
            work(transactionManager),
    ),
    dataSource: {
        entityMetadatas: [
            { tableName: 'user', target: User },
            { tableName: 'legacy_post', target: 'legacy_post' },
            { tableName: 'media', target: MediaEntity },
        ],
    },
    existsBy: mock.fn(
        async (_target: unknown, _where: unknown): Promise<boolean> => true,
    ),
};

const mediaRepository = {
    manager,
    create: mock.fn(
        (input: DeepPartial<MediaEntity>): MediaEntity =>
            Object.assign(new MediaEntity(), input),
    ),
    save: mock.fn(
        async (media: MediaEntity): Promise<MediaEntity> =>
            Object.assign(media, {
                createdAt: new Date('2026-01-01'),
                updatedAt: new Date('2026-01-01'),
            }),
    ),
    delete: mock.fn(
        async (_criteria: unknown): Promise<{ affected?: number | null }> => ({
            affected: 1,
        }),
    ),
    findOneBy: mock.fn(
        async (_where: unknown): Promise<MediaEntity | null> => aMedia(),
    ),
    find: mock.fn(async (_options: unknown): Promise<MediaEntity[]> => []),
};

const attachmentRepository = {
    insert: mock.fn(
        async (_attachment: DeepPartial<MediaAttachmentEntity>) => ({}),
    ),
    delete: mock.fn(
        async (_criteria: unknown): Promise<{ affected?: number | null }> => ({
            affected: 1,
        }),
    ),
};

const conversionWorker = { startSweep: mock.fn(() => undefined) };

const storage = {
    disk: 'local',
    put: mock.fn(async (_input: StoragePutInput): Promise<void> => {}),
    get: mock.fn(
        async (_input: StoragePathInput): Promise<Buffer> => Buffer.alloc(0),
    ),
    deletePrefix: mock.fn(
        async (_input: StoragePrefixInput): Promise<void> => {},
    ),
    url: mock.fn(({ path }: StoragePathInput): string => `/uploads/${path}`),
};

type Mock = { mock: { restore(): void; resetCalls(): void } };

// `mock` is served by the proxy's get trap, so an `in` check never sees it
const isMock = (value: unknown): value is Mock =>
    typeof value === 'function' && (value as Partial<Mock>).mock !== undefined;

/** `restore` puts the initial implementation back, so nothing leaks between tests. */
const resetMocks = (...groups: object[]) => {
    for (const fn of groups.flatMap(Object.values).filter(isMock)) {
        fn.mock.restore();
        fn.mock.resetCalls();
    }
};

const lastCall = <T extends unknown[]>(fn: {
    mock: { calls: readonly { arguments: T }[] };
}) => fn.mock.calls.at(-1)?.arguments;

const stored = () => lastCall(storage.put)?.[0];
const storedPath = () => String(stored()?.path);
const deletedPrefix = () => lastCall(storage.deletePrefix)?.[0].prefix;
const saved = () => lastCall(mediaRepository.save)?.[0] as MediaEntity;

/** What Postgres raises for the insert that loses a race to the same link. */
const uniqueViolation = () =>
    new QueryFailedError(
        'INSERT INTO "media_attachment"',
        [],
        Object.assign(new Error('duplicate key value'), { code: '23505' }),
    );

const isA =
    (type: new (...args: never[]) => Error, message?: RegExp) =>
    (error: unknown) =>
        error instanceof type && (!message || message.test(error.message));

let config: Pick<MediaConfig, 'allowedMimeTypes' | 'maxImagePixels'>;
let mediaService: MediaService;

beforeEach(async () => {
    resetMocks(
        releaseQuery,
        transactionManager,
        manager,
        mediaRepository,
        attachmentRepository,
        conversionWorker,
        storage,
    );

    config = {
        allowedMimeTypes: [
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/svg+xml',
            'application/pdf',
            'application/vnd.ms-excel',
        ],
        maxImagePixels: MAX_IMAGE_PIXELS,
    };

    const module = await Test.createTestingModule({
        providers: [
            MediaService,
            {
                provide: getRepositoryToken(MediaEntity),
                useValue: mediaRepository,
            },
            {
                provide: getRepositoryToken(MediaAttachmentEntity),
                useValue: attachmentRepository,
            },
            { provide: ConversionWorker, useValue: conversionWorker },
            { provide: STORAGE_SERVICE, useValue: storage },
            { provide: mediaConfig.KEY, useValue: config },
        ],
    }).compile();

    mediaService = module.get(MediaService);
});

describe('MediaService.uploadAndAttach', () => {
    it('stores the original as the type its bytes are, whatever the client claimed', async () => {
        await mediaService.uploadAndAttach({
            ...upload,
            file: aFile({ mimetype: 'image/webp' }),
        });

        assert.equal(stored()?.contentType, 'image/png');
        assert.match(storedPath(), /\/original\.png$/);
        assert.equal(saved().mimeType, 'image/png');
    });

    it('refuses a file that claims to be an image but is none, storing nothing', async () => {
        await assert.rejects(
            mediaService.uploadAndAttach({
                ...upload,
                file: aFile({
                    buffer: Buffer.from('<script>alert(1)</script>'),
                }),
            }),
            isA(UnprocessableEntityException, /not a valid image\/png/),
        );
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('refuses an image whose bytes are a type the allow-list refuses', async () => {
        await assert.rejects(
            mediaService.uploadAndAttach({
                ...upload,
                file: aFile({ buffer: await anImage('gif') }),
            }),
            isA(UnsupportedMediaTypeException, /The file is image\/gif/),
        );
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('refuses an image of more pixels than the limit, before anything decodes it', async () => {
        await assert.doesNotReject(
            mediaService.uploadAndAttach({
                ...upload,
                file: aFile({ buffer: await anImage('png', 100, 100) }),
            }),
        );
        await assert.rejects(
            mediaService.uploadAndAttach({
                ...upload,
                file: aFile({ buffer: await anImage('png', 101, 100) }),
            }),
            isA(UnprocessableEntityException, /at most 10,000 pixels/),
        );
        assert.equal(storage.put.mock.callCount(), 1);
    });

    it("names the stored file after its type, never after the client's file name", async () => {
        await mediaService.uploadAndAttach({
            ...upload,
            file: aFile({ originalname: '../../../etc/cron.d/evil' }),
        });

        assert.match(storedPath(), /^user\.avatar\/[^/]+\/original\.png$/);
        assert.equal(saved().name, '../../../etc/cron.d/evil');
    });

    it('records the upload on the media row', async () => {
        const file = aFile();

        await mediaService.uploadAndAttach({ ...upload, file });

        const media = saved();

        assert.partialDeepStrictEqual(media, {
            name: 'holiday.png',
            fileName: 'original.png',
            collectionName: 'user.avatar',
            mimeType: 'image/png',
            size: 2048,
            disk: 'local',
        });
        assert.match(media.id, UUID_V7);
        assert.equal(storedPath(), `${media.directory}/original.png`);
        assert.equal(stored()?.buffer, file.buffer);
    });

    it('links the media to the model within the same save', async () => {
        await mediaService.uploadAndAttach({ ...upload, file: aFile() });

        assert.deepEqual(saved().attachments, [
            { modelType: 'user', modelId: 5 },
        ]);
        assert.equal(mediaRepository.save.mock.callCount(), 1);
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
    });

    it('returns only the public fields, with every declared conversion PENDING under the name the worker writes', async () => {
        const result = await mediaService.uploadAndAttach({
            ...upload,
            file: aFile(),
        });

        assert.deepEqual(Object.keys(result).sort(), [
            'conversions',
            'createdAt',
            'fileName',
            'id',
            'mimeType',
            'name',
            'size',
            'updatedAt',
            'urls',
        ]);
        assert.deepEqual(result.conversions, {
            square: {
                fileName: 'square.webp',
                status: ConversionStatus.Pending,
                attempts: 0,
            },
            banner: {
                fileName: 'banner.jpg',
                status: ConversionStatus.Pending,
                attempts: 0,
            },
        });
    });

    it('starts a sweep for the conversions once the media is saved', async () => {
        mediaRepository.save.mock.mockImplementation(async (media) => {
            assert.equal(conversionWorker.startSweep.mock.callCount(), 0);
            return media;
        });

        await mediaService.uploadAndAttach({ ...upload, file: aFile() });

        assert.equal(conversionWorker.startSweep.mock.callCount(), 1);
    });

    it('rejects a request without a file', async () => {
        await assert.rejects(
            mediaService.uploadAndAttach({ ...upload, file: noFile }),
            isA(BadRequestException, /Provide a file/),
        );
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('rejects a collection the entity does not declare', async () => {
        await assert.rejects(
            mediaService.uploadAndAttach({
                ...upload,
                collection: 'cover',
                file: aFile(),
            }),
            isA(
                BadRequestException,
                /user has no @Media\(\) collection "cover"/,
            ),
        );
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('removes the stored original when the row cannot be saved', async () => {
        const failure = new Error('connection terminated');
        mediaRepository.save.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(
            mediaService.uploadAndAttach({ ...upload, file: aFile() }),
            failure,
        );

        assert.equal(
            deletedPrefix(),
            storedPath().replace(/\/original\.png$/, ''),
        );
        assert.equal(conversionWorker.startSweep.mock.callCount(), 0);
    });

    it('reports the failed save even when the cleanup fails too', async () => {
        const failure = new Error('connection terminated');
        mediaRepository.save.mock.mockImplementation(async () => {
            throw failure;
        });
        storage.deletePrefix.mock.mockImplementation(async () => {
            throw new Error('EACCES');
        });

        await assert.rejects(
            mediaService.uploadAndAttach({ ...upload, file: aFile() }),
            failure,
        );
    });

    it('leaves nothing behind when the upload itself fails', async () => {
        const failure = new Error('ENOSPC: no space left on device');
        storage.put.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(
            mediaService.uploadAndAttach({ ...upload, file: aFile() }),
            failure,
        );

        assert.equal(mediaRepository.save.mock.callCount(), 0);
        assert.equal(
            deletedPrefix(),
            storedPath().replace(/\/original\.png$/, ''),
            'a local write can fail after creating the directory or part of the file',
        );
    });
});

describe('MediaService.upload', () => {
    it('stores an orphan under its collection, attached to nothing', async () => {
        await mediaService.upload({
            collectionName: 'invoices',
            file: aFile(),
        });

        assert.match(storedPath(), /^invoices\/[0-9a-f-]{36}\/original\.png$/);
        assert.equal(saved().collectionName, 'invoices');
        assert.equal(saved().attachments, undefined);
        assert.equal(conversionWorker.startSweep.mock.callCount(), 0);
    });

    it('rejects an empty collection name', async () => {
        await assert.rejects(
            mediaService.upload({ collectionName: '', file: aFile() }),
            isA(BadRequestException, /Provide a collection/),
        );
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('rejects a collection name that is more than a plain name', async () => {
        // the controller passes collectionName straight from the request body
        for (const collectionName of [
            '../../outside',
            'a/b',
            '.hidden',
            'my photos',
            'a#b',
        ])
            await assert.rejects(
                mediaService.upload({ collectionName, file: aFile() }),
                isA(BadRequestException, /letters, digits/),
                collectionName,
            );

        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('accepts letters, digits, "_", "-" and "." in a collection name', async () => {
        await mediaService.upload({
            collectionName: 'blog.cover_2-x',
            file: aFile(),
        });

        assert.match(storedPath(), /^blog\.cover_2-x\/[0-9a-f-]{36}\//);
    });

    it('refuses a declared type the allow-list refuses, even without the interceptor, storing nothing', async () => {
        await assert.rejects(
            mediaService.upload({
                collectionName: 'files',
                file: aFile({
                    mimetype: 'text/html',
                    buffer: Buffer.from('<script>alert(1)</script>'),
                }),
            }),
            isA(UnsupportedMediaTypeException, /The file is text\/html/),
        );
        assert.equal(storage.put.mock.callCount(), 0);
    });
});

describe('MediaService file names', () => {
    const notAnImage = Buffer.from('%PDF-1.7');

    const storedFileName = async (mimetype: string, buffer = notAnImage) => {
        await mediaService.upload({
            collectionName: 'files',
            file: aFile({ mimetype, buffer }),
        });

        return storedPath().split('/').at(-1);
    };

    it('names the file by its type, whatever case or parameters it is given in', async () => {
        for (const [mimetype, buffer, fileName] of [
            ['image/jpeg', await anImage('jpeg'), 'original.jpg'],
            ['image/svg+xml', svg, 'original.svg'],
            ['image/webp', await anImage('webp'), 'original.webp'],
            ['application/pdf', notAnImage, 'original.pdf'],
            ['APPLICATION/PDF; charset=binary', notAnImage, 'original.pdf'],
            // only the letters and digits of a subtype
            ['application/vnd.ms-excel', notAnImage, 'original.vndmsexcel'],
        ] as const)
            assert.equal(
                await storedFileName(mimetype, buffer),
                fileName,
                mimetype,
            );
    });

    it('keeps the declared type of a file sharp reads as no image', async () => {
        await storedFileName('application/pdf');

        assert.equal(stored()?.contentType, 'application/pdf');
    });

    it('refuses a type it cannot derive an extension from, even an allowed one, before storing anything', async () => {
        // "constructor": never an extension from what every object inherits
        const types = [
            'application',
            'application/',
            'application/+++',
            'constructor',
        ];

        config.allowedMimeTypes.push(...types);

        for (const mimetype of types)
            await assert.rejects(
                mediaService.upload({
                    collectionName: 'files',
                    file: aFile({ mimetype, buffer: notAnImage }),
                }),
                isA(UnprocessableEntityException),
                mimetype,
            );

        assert.equal(storage.put.mock.callCount(), 0);
        assert.equal(mediaRepository.save.mock.callCount(), 0);
    });
});

describe('MediaService.attach', () => {
    it('links an existing media to a model', async () => {
        const result = await mediaService.attach(link);

        assert.partialDeepStrictEqual(lastCall(attachmentRepository.insert), [
            { modelType: 'user', modelId: 5, media: { id } },
        ]);
        assert.equal(result.media.id, id);
        assert.equal(result.modelType, 'user');
        assert.equal(result.modelId, 5);
    });

    it('refuses a link that already exists, as the unique constraint reports it', async () => {
        attachmentRepository.insert.mock.mockImplementation(async () => {
            throw uniqueViolation();
        });

        await assert.rejects(
            mediaService.attach(link),
            isA(
                ConflictException,
                new RegExp(`Media ${id} is already attached to user 5`),
            ),
        );
    });

    it('reports a media deleted between being found and linked as missing', async () => {
        attachmentRepository.insert.mock.mockImplementation(async () => {
            throw new QueryFailedError(
                'INSERT INTO "media_attachment"',
                [],
                Object.assign(new Error('violates foreign key constraint'), {
                    code: '23503',
                }),
            );
        });

        await assert.rejects(
            mediaService.attach(link),
            isA(NotFoundException, /No media with id/),
        );
    });

    it('propagates any other failed insert', async () => {
        const failure = new Error('connection terminated');
        attachmentRepository.insert.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(mediaService.attach(link), failure);
    });

    it('reports a media that does not exist', async () => {
        mediaRepository.findOneBy.mock.mockImplementation(async () => null);

        await assert.rejects(
            mediaService.attach(link),
            isA(NotFoundException, new RegExp(`No media with id ${id}`)),
        );
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
    });
});

describe('MediaService model checks', () => {
    // polymorphic links have no foreign key, so only these checks keep a request from pointing at any table
    it('refuses a model type that is no entity declaring @Media(), for an upload and an attach alike', async () => {
        // unregistered, an entity schema without a class, an entity without @Media()
        for (const modelType of ['ghost', 'legacy_post', 'media']) {
            const refused = isA(
                BadRequestException,
                new RegExp(
                    `No model with media is registered as "${modelType}"`,
                ),
            );

            await assert.rejects(
                mediaService.uploadAndAttach({
                    ...upload,
                    modelType,
                    file: aFile(),
                }),
                refused,
            );
            await assert.rejects(
                mediaService.attach({ ...link, modelType }),
                refused,
            );
        }

        assert.equal(manager.existsBy.mock.callCount(), 0);
        assert.equal(storage.put.mock.callCount(), 0);
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
    });

    it('refuses a model that does not exist', async () => {
        manager.existsBy.mock.mockImplementation(async () => false);

        await assert.rejects(
            mediaService.uploadAndAttach({ ...upload, file: aFile() }),
            isA(NotFoundException, /No user with id 5/),
        );
        await assert.rejects(
            mediaService.attach(link),
            isA(NotFoundException, /No user with id 5/),
        );
        assert.deepEqual(lastCall(manager.existsBy), [User, { id: 5 }]);
        assert.equal(storage.put.mock.callCount(), 0);
        assert.equal(attachmentRepository.insert.mock.callCount(), 0);
    });
});

describe('MediaService.detach', () => {
    it('removes only the link between the media and that model', async () => {
        await mediaService.detach(link);

        assert.deepEqual(lastCall(attachmentRepository.delete), [
            { media: { id }, modelType: 'user', modelId: 5 },
        ]);
        assert.equal(mediaRepository.delete.mock.callCount(), 0);
        assert.equal(storage.deletePrefix.mock.callCount(), 0);
    });

    it('reports a media that does not exist', async () => {
        mediaRepository.findOneBy.mock.mockImplementation(async () => null);

        await assert.rejects(
            mediaService.detach(link),
            isA(NotFoundException, new RegExp(`No media with id ${id}`)),
        );
        assert.equal(attachmentRepository.delete.mock.callCount(), 0);
    });

    it('reports a link that does not exist', async () => {
        attachmentRepository.delete.mock.mockImplementation(async () => ({
            affected: 0,
        }));

        await assert.rejects(
            mediaService.detach(link),
            isA(
                NotFoundException,
                new RegExp(`Media ${id} is not attached to user 5`),
            ),
        );
    });
});

describe('MediaService.delete', () => {
    it('removes the row first, then every file in its directory', async () => {
        const order: string[] = [];
        mediaRepository.delete.mock.mockImplementation(async () => {
            order.push('row');
            return { affected: 1 };
        });
        storage.deletePrefix.mock.mockImplementation(async ({ prefix }) => {
            order.push(`files:${prefix}`);
        });

        await mediaService.delete({ id });

        assert.deepEqual(lastCall(mediaRepository.findOneBy), [{ id }]);
        assert.deepEqual(lastCall(mediaRepository.delete), [{ id }]);
        assert.deepEqual(order, ['row', `files:user.avatar/${id}`]);
    });

    it('reports a media that does not exist, and deletes nothing', async () => {
        mediaRepository.findOneBy.mock.mockImplementation(async () => null);

        await assert.rejects(
            mediaService.delete({ id }),
            isA(NotFoundException, new RegExp(`No media with id ${id}`)),
        );
        assert.equal(mediaRepository.delete.mock.callCount(), 0);
        assert.equal(storage.deletePrefix.mock.callCount(), 0);
    });

    it('keeps the files when the row cannot be removed', async () => {
        mediaRepository.delete.mock.mockImplementation(async () => {
            throw new Error('connection terminated');
        });

        await assert.rejects(mediaService.delete({ id }));
        assert.equal(storage.deletePrefix.mock.callCount(), 0);
    });
});

describe('MediaService.findForModel', () => {
    it('finds the media attached to a model, newest first', async () => {
        const newer = '01926d3a-9999-7cc2-a0a9-3b6f1c2d4e5f';
        const older = '01926d3a-1111-7cc2-a0a9-3b6f1c2d4e5f';
        mediaRepository.find.mock.mockImplementation(async () => [
            aMedia({ id: newer }),
            aMedia({ id: older }),
        ]);

        const result = await mediaService.findForModel({
            modelType: 'user',
            modelId: 5,
        });

        assert.deepEqual(lastCall(mediaRepository.find), [
            {
                where: { attachments: { modelType: 'user', modelId: 5 } },
                order: { createdAt: 'DESC' },
            },
        ]);
        assert.deepEqual(
            result.map(({ id }) => id),
            [newer, older],
        );
        assert.ok(result.every((media) => !(media instanceof MediaEntity)));
    });

    it("narrows to what was uploaded into one of the model's collections", async () => {
        await mediaService.findForModel({
            modelType: 'user',
            modelId: 5,
            collection: 'avatar',
        });

        assert.deepEqual(lastCall(mediaRepository.find), [
            {
                where: {
                    attachments: { modelType: 'user', modelId: 5 },
                    collectionName: 'user.avatar',
                },
                order: { createdAt: 'DESC' },
            },
        ]);
    });
});

describe('MediaService.findUrls', () => {
    it('points the original at the file in the media directory', async () => {
        const { original } = await mediaService.findUrls({ id });

        assert.equal(original, `/uploads/user.avatar/${id}/original.png`);
    });

    it('gives a url only to the conversions that are DONE', async () => {
        const state = (fileName: string, status: ConversionStatus) => ({
            fileName,
            spec: {},
            status,
            attempts: 1,
        });
        mediaRepository.findOneBy.mock.mockImplementation(async () =>
            aMedia({
                conversions: {
                    square: state('square.webp', ConversionStatus.Done),
                    banner: state('banner.jpg', ConversionStatus.Processing),
                    thumb: state('thumb.webp', ConversionStatus.Pending),
                    poster: state('poster.webp', ConversionStatus.Failed),
                },
            }),
        );

        const { conversions } = await mediaService.findUrls({ id });

        assert.deepEqual(conversions, {
            square: `/uploads/user.avatar/${id}/square.webp`,
            banner: null,
            thumb: null,
            poster: null,
        });
    });
});

const older = '01926d3a-1111-7cc2-a0a9-3b6f1c2d4e5f';
const shared = '01926d3a-2222-7cc2-a0a9-3b6f1c2d4e5f';

/** What the delete inside release was given, and what it deleted the files of. */
const released = () => ({
    ids: lastCall(releaseQuery.where)?.[1],
    model: lastCall(releaseQuery.andWhere)?.[1],
    detachedFrom: lastCall(transactionManager.delete)?.[1],
    prefixes: storage.deletePrefix.mock.calls.map(
        ({ arguments: [input] }) => input.prefix,
    ),
});

describe('MediaService.uploadAndAttach into a single collection', () => {
    const badge = { modelType: 'user', modelId: 5, collection: 'badge' };

    it('keeps only the newest upload in that collection, letting the model go of the rest', async () => {
        const newer = '01926d3a-9999-7cc2-a0a9-3b6f1c2d4e5f';

        mediaRepository.find.mock.mockImplementation(async () => [
            aMedia({ id: newer }),
            aMedia({ id: older }),
        ]);
        releaseQuery.execute.mock.mockImplementation(async () => ({
            raw: [{ id: older, collectionName: 'user.badge' }],
        }));

        await mediaService.uploadAndAttach({ ...badge, file: aFile() });

        assert.deepEqual(lastCall(mediaRepository.find), [
            {
                select: { id: true },
                where: {
                    collectionName: 'user.badge',
                    attachments: { modelType: 'user', modelId: 5 },
                },
                order: { id: 'DESC' },
            },
        ]);
        assert.equal(manager.transaction.mock.callCount(), 1);
        assert.deepEqual(released(), {
            ids: { ids: [older] },
            model: { modelType: 'user', modelId: 5 },
            detachedFrom: {
                media: { id: In([older]) },
                modelType: 'user',
                modelId: 5,
            },
            prefixes: [`user.badge/${older}`],
        });
    });

    it('lets go of its own upload when a racing one is newer', async () => {
        const newer = '01ffffff-9999-7cc2-a0a9-3b6f1c2d4e5f';

        mediaRepository.find.mock.mockImplementation(async () => [
            aMedia({ id: newer }),
            aMedia({ id: saved().id }),
        ]);

        const media = await mediaService.uploadAndAttach({
            ...badge,
            file: aFile(),
        });

        assert.deepEqual(released().ids, { ids: [media.id] });
    });

    it('keeps everything else in a collection that is not single', async () => {
        await mediaService.uploadAndAttach({ ...upload, file: aFile() });

        assert.equal(mediaRepository.find.mock.callCount(), 0);
        assert.equal(manager.transaction.mock.callCount(), 0);
    });

    it('still succeeds when the replaced ones cannot be removed, logging it', async () => {
        const logged = mock.method(Logger.prototype, 'error', () => {});

        mediaRepository.find.mock.mockImplementation(async () => [
            aMedia(),
            aMedia({ id: older }),
        ]);
        manager.transaction.mock.mockImplementation(async () => {
            throw new Error('connection lost');
        });

        const media = await mediaService.uploadAndAttach({
            ...badge,
            file: aFile(),
        });

        assert.equal(media.name, 'holiday.png');
        assert.match(
            String(logged.mock.calls[0]?.arguments[0]),
            /connection lost/,
        );
        logged.mock.restore();
    });
});

describe('MediaService.deleteForModel', () => {
    it('deletes what only the model had, files included, and detaches the rest', async () => {
        mediaRepository.find.mock.mockImplementation(async () => [
            aMedia({ id: older }),
            aMedia({ id: shared }),
        ]);
        releaseQuery.execute.mock.mockImplementation(async () => ({
            raw: [{ id: older, collectionName: 'user.avatar' }],
        }));
        transactionManager.delete.mock.mockImplementation(async () => ({
            affected: 1,
        }));

        const result = await mediaService.deleteForModel({
            modelType: 'user',
            modelId: 5,
        });

        assert.deepEqual(result, { deleted: 1, detached: 1 });
        assert.deepEqual(lastCall(mediaRepository.find), [
            {
                select: { id: true },
                where: { attachments: { modelType: 'user', modelId: 5 } },
            },
        ]);
        assert.deepEqual(released(), {
            ids: { ids: [older, shared] },
            model: { modelType: 'user', modelId: 5 },
            detachedFrom: {
                media: { id: In([older, shared]) },
                modelType: 'user',
                modelId: 5,
            },
            prefixes: [`user.avatar/${older}`],
        });
    });

    it('deletes only media no other model has, deciding in the delete itself', async () => {
        mediaRepository.find.mock.mockImplementation(async () => [aMedia()]);

        await mediaService.deleteForModel({ modelType: 'user', modelId: 5 });

        assert.match(
            String(lastCall(releaseQuery.andWhere)?.[0]),
            /NOT EXISTS .*"modelType" <> :modelType OR .*"modelId" <> :modelId/,
        );
    });

    it('locks the media rows, in id order, before deciding what to delete', async () => {
        const order: string[] = [];

        mediaRepository.find.mock.mockImplementation(async () => [aMedia()]);
        transactionManager.query.mock.mockImplementation(async () => {
            order.push('lock');
            return [];
        });
        releaseQuery.execute.mock.mockImplementation(async () => {
            order.push('delete');
            return { raw: [] };
        });

        await mediaService.deleteForModel({ modelType: 'user', modelId: 5 });

        assert.deepEqual(order, ['lock', 'delete']);
        assert.deepEqual(lastCall(transactionManager.query), [
            'SELECT 1 FROM "media" WHERE "id" = ANY(CAST($1 AS uuid[])) ORDER BY "id" FOR UPDATE',
            [[id]],
        ]);
    });

    it('does nothing for a model without media', async () => {
        assert.deepEqual(
            await mediaService.deleteForModel({
                modelType: 'user',
                modelId: 5,
            }),
            { deleted: 0, detached: 0 },
        );
        assert.equal(manager.transaction.mock.callCount(), 0);
    });

    it('keeps the files when the rows cannot be deleted', async () => {
        mediaRepository.find.mock.mockImplementation(async () => [aMedia()]);
        releaseQuery.execute.mock.mockImplementation(async () => {
            throw new Error('deadlock');
        });

        await assert.rejects(
            mediaService.deleteForModel({ modelType: 'user', modelId: 5 }),
            /deadlock/,
        );
        assert.equal(storage.deletePrefix.mock.callCount(), 0);
    });

    it('reports the rows as deleted when only their files could not be, logging it', async () => {
        const logged = mock.method(Logger.prototype, 'error', () => {});

        mediaRepository.find.mock.mockImplementation(async () => [aMedia()]);
        releaseQuery.execute.mock.mockImplementation(async () => ({
            raw: [{ id, collectionName: 'user.avatar' }],
        }));
        storage.deletePrefix.mock.mockImplementation(async () => {
            throw new Error('bucket unreachable');
        });

        assert.deepEqual(
            await mediaService.deleteForModel({
                modelType: 'user',
                modelId: 5,
            }),
            { deleted: 1, detached: 0 },
        );
        assert.match(
            String(logged.mock.calls[0]?.arguments[0]),
            /bucket unreachable/,
        );
        logged.mock.restore();
    });
});
