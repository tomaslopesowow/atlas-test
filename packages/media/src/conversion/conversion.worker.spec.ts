import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import sharp from 'sharp';
import type { FindOperator } from 'typeorm';
import type { ConversionSpec } from '../decorators/media.decorator.js';
import {
    hasUnfinishedConversion,
    MediaEntity,
} from '../entities/media.entity.js';
import { mediaConfig } from '../media.config.js';
import {
    type IStorageService,
    STORAGE_SERVICE,
    type StoragePathInput,
    type StoragePrefixInput,
    type StoragePutInput,
} from '../storage/storage.interface.js';
import {
    type ConversionState,
    ConversionStatus,
    type Conversions,
} from '../types/types.js';
import {
    ConversionWorker,
    conversionFileName,
    pendingConversions,
} from './conversion.worker.js';

const uuid = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';
const directory = `user.avatar/${uuid}`;
const MINUTE = 60_000;

/** Thousands of distinct colours, so a palette or a low quality visibly loses detail. */
const aGradient = (width: number, height: number) => {
    const pixels = Buffer.alloc(width * height * 3);

    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            pixels.set(
                [(x * 255) / width, (y * 255) / height, (x + y) % 256],
                (y * width + x) * 3,
            );

    return sharp(pixels, { raw: { width, height, channels: 3 } })
        .png()
        .toBuffer();
};

const photo = await aGradient(200, 100);
const MAX_IMAGE_PIXELS = 200 * 100;

/** The conversions column of each media row, which the fake UPDATE reads and writes. */
const rows = new Map<string, Conversions>();

/** Every state the worker moved a conversion to, in order, as `name:STATUS:attempts`. */
const history: string[] = [];

const updates: FakeUpdate[] = [];

/** Throws to stand in for a database that cannot be reached. */
const reachDatabase = mock.fn((): void => {});

class FakeUpdate {
    target: unknown;
    values: Record<string, unknown> = {};
    readonly conditions: string[] = [];
    readonly parameters: Record<string, unknown> = {};

    update(target: unknown) {
        this.target = target;
        return this;
    }

    set(values: Record<string, unknown>) {
        this.values = values;
        return this;
    }

    where(condition: string, parameters: Record<string, unknown>) {
        this.conditions.push(condition);
        Object.assign(this.parameters, parameters);
        return this;
    }

    andWhere(condition: string) {
        this.conditions.push(condition);
        return this;
    }

    setParameters(parameters: Record<string, unknown>) {
        Object.assign(this.parameters, parameters);
        return this;
    }

    /** As Postgres would: the row must exist and the key still hold the state the worker read. */
    async execute() {
        updates.push(this);
        reachDatabase();

        const { id, name, from, to } = this.parameters as {
            [key in 'id' | 'name' | 'from' | 'to']: string;
        };
        const conversions = rows.get(id);
        const current = conversions?.[name];
        const expected = JSON.parse(from) as ConversionState;

        if (
            !conversions ||
            current?.status !== expected.status ||
            current.attempts !== expected.attempts
        )
            return { affected: 0 };

        const next = JSON.parse(to) as ConversionState;
        conversions[name] = next;
        history.push(`${name}:${next.status}:${next.attempts}`);

        return { affected: 1 };
    }
}

/** A media row as the sweep loads it. */
const loaded = (id: string) =>
    Object.assign(new MediaEntity(), {
        id,
        collectionName: 'user.avatar',
        fileName: 'original.png',
        conversions: structuredClone(rows.get(id)),
    });

const repository = {
    createQueryBuilder: () => new FakeUpdate(),
    existsBy: async ({ id }: { id: string }) => rows.has(id),
    // every row, oldest first: the worker skips what is not claimable, as the query would
    find: mock.fn(
        async (_options: unknown): Promise<MediaEntity[]> =>
            [...rows.keys()].map(loaded),
    ),
};

const files = new Map<string, Buffer>();

const storage = {
    disk: 'local',
    put: mock.fn(async ({ path, buffer }: StoragePutInput): Promise<void> => {
        files.set(path, buffer);
    }),
    get: async ({ path }: StoragePathInput) => {
        const file = files.get(path);

        if (!file) throw new Error(`ENOENT: ${path}`);

        return file;
    },
    deletePrefix: async ({ prefix }: StoragePrefixInput) => {
        for (const key of [...files.keys()])
            if (key.startsWith(`${prefix}/`)) files.delete(key);
    },
    url: ({ path }: StoragePathInput) => `/uploads/${path}`,
} satisfies IStorageService;

/** A media row in the given states, with its original in storage. */
const aMedia = (
    conversions: Conversions,
    { id = uuid, original = photo } = {},
) => {
    rows.set(id, structuredClone(conversions));
    files.set(`user.avatar/${id}/original.png`, original);
};

const aState = (overrides: Partial<ConversionState> = {}): ConversionState => ({
    fileName: 'square.webp',
    spec: {},
    status: ConversionStatus.Pending,
    attempts: 0,
    ...overrides,
});

const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * MINUTE).toISOString();

const output = (fileName: string) => {
    const file = files.get(`${directory}/${fileName}`);

    assert.ok(file, `${fileName} was not written`);

    return file;
};

const metadata = (fileName: string) => sharp(output(fileName)).metadata();

/** Holds the next storage write until released, and resolves once it has started. */
const holdNextWrite = () => {
    let release = () => {};
    let started = () => {};
    const reached = new Promise<void>((resolve) => {
        started = resolve;
    });

    storage.put.mock.mockImplementationOnce(async ({ path, buffer }) => {
        started();
        await new Promise<void>((resolve) => {
            release = resolve;
        });
        files.set(path, buffer);
    });

    return { reached, release: () => release() };
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

let logged: string[];
let worker: ConversionWorker;

/** Uploads with these conversions declared, then sweeps. */
const convert = (specs: Record<string, ConversionSpec>, original = photo) => {
    aMedia(pendingConversions(specs), { original });

    return worker.sweep();
};

beforeEach(async () => {
    rows.clear();
    files.clear();
    history.length = 0;
    updates.length = 0;
    logged = [];

    for (const fn of [reachDatabase, storage.put, repository.find])
        fn.mock.resetCalls();

    mock.method(Logger.prototype, 'error', (message: unknown) => {
        logged.push(String(message));
    });

    const module = await Test.createTestingModule({
        providers: [
            ConversionWorker,
            { provide: getRepositoryToken(MediaEntity), useValue: repository },
            { provide: STORAGE_SERVICE, useValue: storage },
            {
                provide: mediaConfig.KEY,
                useValue: { maxImagePixels: MAX_IMAGE_PIXELS },
            },
        ],
    }).compile();

    worker = module.get(ConversionWorker);
});

afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
});

describe('conversionFileName', () => {
    it('names the file after the conversion, in webp unless told otherwise', () => {
        assert.equal(conversionFileName('square', {}), 'square.webp');
        assert.equal(
            conversionFileName('square', { format: 'png' }),
            'square.png',
        );
    });

    it('gives a jpeg the extension an original jpeg gets', () => {
        assert.equal(
            conversionFileName('banner', { format: 'jpeg' }),
            'banner.jpg',
        );
    });
});

describe('pendingConversions', () => {
    it('lists each conversion as PENDING with its spec, under the name it will be written as', () => {
        assert.deepEqual(
            pendingConversions({ square: {}, banner: { format: 'jpeg' } }),
            {
                square: aState(),
                banner: aState({
                    fileName: 'banner.jpg',
                    spec: { format: 'jpeg' },
                }),
            },
        );
    });
});

describe('ConversionWorker.sweep', () => {
    it('looks for media with a PENDING conversion or one PROCESSING for over five minutes, oldest first', async () => {
        const before = Date.now();

        await worker.sweep();

        const [options] = repository.find.mock.calls[0]?.arguments as [
            {
                where: { conversions: FindOperator<unknown> };
                order: unknown;
                take: number;
            },
        ];
        const { type, objectLiteralParameters: parameters } =
            options.where.conversions;
        const staleBefore = (parameters?.staleBefore as Date).getTime();

        assert.equal(type, 'raw');
        assert.ok(
            options.where.conversions
                .getSql?.('"conversions"')
                .startsWith(hasUnfinishedConversion('"conversions"')),
            "without the index's own condition, Postgres scans every media",
        );
        assert.deepEqual(options.order, { createdAt: 'ASC' });
        assert.equal(options.take, 50);
        assert.equal(parameters?.pending, '{"status":"PENDING"}');
        assert.equal(parameters?.processing, '{"status":"PROCESSING"}');
        assert.ok(
            staleBefore >= before - 5 * MINUTE &&
                staleBefore <= Date.now() - 5 * MINUTE,
        );
    });

    it('claims a conversion as PROCESSING, with when it started, writes it next to the original, then records DONE', async () => {
        const before = Date.now();

        await convert({ square: {} });

        const { startedAt, ...state } = rows.get(uuid)?.square ?? aState();

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:DONE:1']);
        assert.deepEqual(
            state,
            aState({ status: ConversionStatus.Done, attempts: 1 }),
        );
        assert.ok(startedAt && Date.parse(startedAt) >= before);
        assert.ok(files.has(`${directory}/square.webp`));
    });

    it('writes only its own key, only from the state it read, with every placeholder bound', async () => {
        await convert({ square: {} });

        const [claim] = updates;
        assert.ok(claim);

        const sql = [
            (claim.values.conversions as () => string)(),
            ...claim.conditions,
        ].join(' ');

        assert.equal(claim.target, MediaEntity);
        assert.deepEqual(Object.keys(claim.values), ['conversions']);
        assert.match(sql, /^jsonb_set\("conversions", /);
        assert.match(sql, /"conversions" -> CAST\(:name AS text\) @> /);
        assert.deepEqual(JSON.parse(String(claim.parameters.from)), {
            status: ConversionStatus.Pending,
            attempts: 0,
        });

        // a `::type` cast is not a placeholder
        for (const [, name] of sql.matchAll(/(?<!:):(\w+)/g))
            assert.ok(
                name && Object.hasOwn(claim.parameters, name),
                `:${name} has no value`,
            );
    });

    it('converts nothing another process claimed after the sweep read the row', async () => {
        aMedia({ square: aState() });
        repository.find.mock.mockImplementationOnce(async () => {
            const media = [loaded(uuid)];
            rows.set(uuid, {
                square: aState({
                    status: ConversionStatus.Processing,
                    attempts: 1,
                    startedAt: minutesAgo(0),
                }),
            });

            return media;
        });

        await worker.sweep();

        assert.deepEqual(history, []);
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('leaves alone a conversion started less than five minutes ago, and one DONE or FAILED', async () => {
        aMedia({
            busy: aState({
                status: ConversionStatus.Processing,
                attempts: 1,
                startedAt: minutesAgo(4),
            }),
            done: aState({ status: ConversionStatus.Done, attempts: 1 }),
            failed: aState({ status: ConversionStatus.Failed, attempts: 3 }),
        });

        await worker.sweep();

        assert.equal(updates.length, 0);
    });

    it('reclaims a conversion a stopped process left PROCESSING past the lease, as its next attempt', async () => {
        aMedia({
            square: aState({
                status: ConversionStatus.Processing,
                attempts: 1,
                startedAt: minutesAgo(10),
            }),
        });

        await worker.sweep();

        assert.deepEqual(history, ['square:PROCESSING:2', 'square:DONE:2']);
    });

    it('fails a conversion abandoned during its last attempt, without converting it', async () => {
        aMedia({
            square: aState({
                status: ConversionStatus.Processing,
                attempts: 3,
                startedAt: minutesAgo(10),
            }),
        });

        await worker.sweep();

        assert.deepEqual(history, ['square:FAILED:3']);
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('leaves no file behind for a media deleted while it was converting', async () => {
        storage.put.mock.mockImplementation(async ({ path, buffer }) => {
            files.set(path, buffer);
            // deleted, with its directory, while the conversion was being stored
            rows.delete(uuid);
            files.delete(`${directory}/original.png`);
        });

        await convert({ square: {} });

        assert.deepEqual(
            [...files.keys()],
            [],
            'the conversion outlived its media, and nothing will ever delete it',
        );
    });

    it('keeps the file when another process took the conversion over meanwhile', async () => {
        storage.put.mock.mockImplementation(async ({ path, buffer }) => {
            files.set(path, buffer);
            rows.set(uuid, {
                square: aState({
                    status: ConversionStatus.Processing,
                    attempts: 2,
                    startedAt: minutesAgo(0),
                }),
            });
        });

        await convert({ square: {} });

        assert.ok(files.has(`${directory}/square.webp`));
    });

    it('carries on, logging it, when a state cannot be recorded', async () => {
        reachDatabase.mock.mockImplementation(() => {
            throw new Error('connection terminated');
        });

        await assert.doesNotReject(convert({ square: {}, banner: {} }));

        assert.deepEqual(logged, [
            `Could not record the state of square for media ${uuid}`,
            `Could not record the state of banner for media ${uuid}`,
        ]);
        assert.equal(storage.put.mock.callCount(), 0);
    });
});

describe('ConversionWorker.sweep, when converting fails', () => {
    it('fails a broken image at once, since trying again cannot fix it', async () => {
        await convert({ square: {} }, Buffer.from('not an image'));

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:FAILED:1']);
        assert.deepEqual(logged, [
            `Cannot convert ${directory}/square.webp, so it is not tried again`,
        ]);
    });

    it('fails an original of more pixels than the limit without decoding it', async () => {
        await convert({ square: {} }, await aGradient(201, 100));

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:FAILED:1']);
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('fails a spec sharp refuses, and carries on with the next conversion', async () => {
        await convert({ broken: { width: 0 }, square: {} });

        assert.deepEqual(history, [
            'broken:PROCESSING:1',
            'broken:FAILED:1',
            'square:PROCESSING:1',
            'square:DONE:1',
        ]);
    });

    it('puts a conversion back to PENDING on a storage failure, for the next sweep, and fails it on the third', async () => {
        storage.put.mock.mockImplementation(async () => {
            throw new Error('ECONNRESET');
        });

        await convert({ square: {} });

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:PENDING:1']);

        await worker.sweep();
        await worker.sweep();

        assert.deepEqual(history.slice(2), [
            'square:PROCESSING:2',
            'square:PENDING:2',
            'square:PROCESSING:3',
            'square:FAILED:3',
        ]);
        assert.deepEqual(logged, [
            `Could not convert ${directory}/square.webp, so the next sweep tries again`,
            `Could not convert ${directory}/square.webp, so the next sweep tries again`,
            `Gave up converting ${directory}/square.webp after 3 attempts`,
        ]);
    });
});

describe('ConversionWorker.sweep, the output', () => {
    it('resizes into the requested box', async () => {
        await convert({
            square: { width: 64, height: 64, fit: 'cover' },
            within: { width: 64, height: 64, fit: 'inside' },
        });

        const square = await metadata('square.webp');
        const within = await metadata('within.webp');

        assert.deepEqual([square.width, square.height], [64, 64]);
        assert.deepEqual([within.width, within.height], [64, 32]);
    });

    it('encodes in the requested format, stored with its content type', async () => {
        await convert({
            asJpeg: { format: 'jpeg' },
            asPng: { format: 'png' },
            asAvif: { format: 'avif' },
        });

        assert.equal((await metadata('asJpeg.jpg')).format, 'jpeg');
        assert.equal((await metadata('asPng.png')).format, 'png');
        assert.equal((await metadata('asAvif.avif')).compression, 'av1');
        assert.deepEqual(
            storage.put.mock.calls.map(
                ({ arguments: [{ contentType }] }) => contentType,
            ),
            ['image/jpeg', 'image/png', 'image/avif'],
        );
    });

    it('encodes at the requested quality', async () => {
        await convert({
            low: { format: 'jpeg', quality: 10 },
            high: { format: 'jpeg', quality: 95 },
        });

        assert.ok(output('low.jpg').length < output('high.jpg').length);
    });

    it('turns the image upright by its EXIF orientation', async () => {
        // stored 64×32 with orientation 6: a phone held upright, displayed 32×64
        const upright = await sharp(await aGradient(64, 32))
            .jpeg()
            .withMetadata({ orientation: 6 })
            .toBuffer();

        await convert({ copy: {} }, upright);

        const { width, height, orientation } = await metadata('copy.webp');

        assert.deepEqual([width, height], [32, 64]);
        assert.equal(orientation, undefined);
    });

    it('never enlarges an original smaller than the requested box', async () => {
        await convert(
            { square: { width: 128, height: 128, fit: 'cover' } },
            await aGradient(40, 20),
        );

        const { width, height } = await metadata('square.webp');

        assert.deepEqual([width, height], [40, 20]);
    });

    it('keeps a png conversion lossless when no quality is asked for', async () => {
        const original = await aGradient(64, 64);

        await convert({ copy: { format: 'png' } }, original);

        const before = await sharp(original).raw().toBuffer();
        const after = await sharp(output('copy.png')).raw().toBuffer();
        const drift = before.reduce(
            (max, value, i) => Math.max(max, Math.abs(value - (after[i] ?? 0))),
            0,
        );

        assert.equal(
            drift,
            0,
            "passing the default quality switches on sharp's palette quantisation for png",
        );
    });

    describe('of a transparent original', () => {
        // fully transparent black, so a white result can only come from the flattening
        const transparent = () =>
            sharp({
                create: {
                    width: 8,
                    height: 8,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                },
            })
                .png()
                .toBuffer();

        it('is flattened onto white for a jpeg, which has no alpha channel', async () => {
            await convert({ flat: { format: 'jpeg' } }, await transparent());

            const pixels = await sharp(output('flat.jpg')).raw().toBuffer();

            assert.ok(
                Math.min(...pixels) >= 250,
                'libvips flattens alpha onto black unless told otherwise',
            );
        });

        it('stays transparent in a format that carries alpha', async () => {
            await convert({ clear: {} }, await transparent());

            assert.equal((await metadata('clear.webp')).hasAlpha, true);
        });
    });
});

describe('ConversionWorker sweeping', () => {
    it('sweeps at boot, then every minute, and no more once stopped', async () => {
        mock.timers.enable({ apis: ['setInterval'] });

        worker.onApplicationBootstrap();
        await settle();
        assert.equal(repository.find.mock.callCount(), 1);

        mock.timers.tick(MINUTE);
        await settle();
        assert.equal(repository.find.mock.callCount(), 2);

        await worker.onModuleDestroy();
        mock.timers.tick(MINUTE);
        assert.equal(repository.find.mock.callCount(), 2);
    });

    it('sweeps once more when asked while a sweep runs, so a new upload never waits for the timer', async () => {
        let release = () => {};
        repository.find.mock.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    release = () => resolve([]);
                }),
        );

        worker.startSweep();
        worker.startSweep();
        worker.startSweep();
        await settle();
        assert.equal(repository.find.mock.callCount(), 1);

        release();
        await settle();
        assert.equal(repository.find.mock.callCount(), 2);
    });

    it('on shutdown, finishes the conversion underway and leaves the rest PENDING', async () => {
        aMedia(pendingConversions({ square: {} }), { id: 'running' });
        aMedia(pendingConversions({ square: {} }), { id: 'queued' });
        const write = holdNextWrite();

        worker.startSweep();
        await write.reached;
        worker.startSweep();

        const stopped = worker.onModuleDestroy();
        write.release();
        await stopped;

        assert.equal(
            rows.get('running')?.square?.status,
            ConversionStatus.Done,
        );
        assert.equal(
            rows.get('queued')?.square?.status,
            ConversionStatus.Pending,
        );
        assert.equal(
            repository.find.mock.callCount(),
            1,
            'a sweep asked for meanwhile still ran',
        );
    });
});
