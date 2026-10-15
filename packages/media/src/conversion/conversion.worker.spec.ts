import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import timers from 'node:timers/promises';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import sharp from 'sharp';
import type { FindOperator } from 'typeorm';
import type { ConversionSpec } from '../decorators/media.decorator.js';
import { MediaEntity } from '../entities/media.entity.js';
import {
    type IStorageService,
    STORAGE_SERVICE,
    type StoragePathInput,
    type StoragePathsInput,
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

const repository = {
    createQueryBuilder: () => new FakeUpdate(),
    existsBy: async ({ id }: { id: string }) => rows.has(id),
    find: mock.fn(async (_options: unknown): Promise<MediaEntity[]> => []),
};

/** A media row whose conversions are in the given states, as the worker would load it. */
const aMedia = (conversions: Conversions) => {
    rows.set(uuid, structuredClone(conversions));

    return Object.assign(new MediaEntity(), {
        id: uuid,
        collectionName: 'user.avatar',
        fileName: 'original.png',
        conversions: structuredClone(conversions),
    });
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
    delete: async ({ paths }: StoragePathsInput) => {
        for (const path of paths) files.delete(path);
    },
    deletePrefix: async ({ prefix }: StoragePrefixInput) => {
        for (const key of [...files.keys()])
            if (key.startsWith(`${prefix}/`)) files.delete(key);
    },
    exists: async ({ path }: StoragePathInput) => files.has(path),
    url: ({ path }: StoragePathInput) => `/uploads/${path}`,
} satisfies IStorageService;

const output = (fileName: string) => {
    const file = files.get(`${directory}/${fileName}`);

    assert.ok(file, `${fileName} was not written`);

    return file;
};

const metadata = (fileName: string) => sharp(output(fileName)).metadata();

const delay = mock.fn(async (_ms?: number): Promise<void> => undefined);

let logged: string[];
let worker: ConversionWorker;

/** Uploads with these conversions declared: what the service hands the worker. */
const run = (specs: Record<string, ConversionSpec>, original = photo) =>
    worker.run({ media: aMedia(pendingConversions(specs)), original });

beforeEach(async () => {
    rows.clear();
    files.clear();
    history.length = 0;
    updates.length = 0;
    logged = [];

    for (const fn of [reachDatabase, storage.put, delay, repository.find])
        fn.mock.resetCalls();

    mock.method(Logger.prototype, 'error', (message: unknown) => {
        logged.push(String(message));
    });

    // the worker imports setTimeout by name, which only follows a patch once re-synced
    mock.method(timers, 'setTimeout', delay);
    syncBuiltinESMExports();

    const module = await Test.createTestingModule({
        providers: [
            ConversionWorker,
            { provide: getRepositoryToken(MediaEntity), useValue: repository },
            { provide: STORAGE_SERVICE, useValue: storage },
        ],
    }).compile();

    worker = module.get(ConversionWorker);
});

afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
    syncBuiltinESMExports();
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

describe('ConversionWorker.run', () => {
    it('writes each conversion next to the original', async () => {
        await run({ square: { width: 64, height: 64, fit: 'cover' } });

        assert.deepEqual([...files.keys()], [`${directory}/square.webp`]);
    });

    it('records PROCESSING, with when it started, and then DONE', async () => {
        const before = Date.now();

        await run({ square: {} });

        const { startedAt, ...state } = rows.get(uuid)?.square ?? aState();

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:DONE:1']);
        assert.deepEqual(
            state,
            aState({ status: ConversionStatus.Done, attempts: 1 }),
        );
        assert.ok(startedAt && Date.parse(startedAt) >= before);
    });

    it('writes only its own key, only from the state it read, with every placeholder bound', async () => {
        await run({ square: {} });

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

    it('resizes into the requested box', async () => {
        await run({
            square: { width: 64, height: 64, fit: 'cover' },
            within: { width: 64, height: 64, fit: 'inside' },
        });

        const square = await metadata('square.webp');
        const within = await metadata('within.webp');

        assert.deepEqual([square.width, square.height], [64, 64]);
        assert.deepEqual([within.width, within.height], [64, 32]);
    });

    it('encodes in the requested format', async () => {
        await run({
            asJpeg: { format: 'jpeg' },
            asPng: { format: 'png' },
            asAvif: { format: 'avif' },
        });

        assert.equal((await metadata('asJpeg.jpg')).format, 'jpeg');
        assert.equal((await metadata('asPng.png')).format, 'png');
        assert.equal((await metadata('asAvif.avif')).compression, 'av1');
    });

    it('stores each conversion with the content type of its format', async () => {
        await run({
            square: {},
            banner: { format: 'jpeg' },
            poster: { format: 'avif' },
        });

        assert.deepEqual(
            storage.put.mock.calls.map(
                ({ arguments: [{ contentType }] }) => contentType,
            ),
            ['image/webp', 'image/jpeg', 'image/avif'],
        );
    });

    it('encodes at the requested quality', async () => {
        await run({
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

        await run({ copy: {} }, upright);

        const { width, height, orientation } = await metadata('copy.webp');

        assert.deepEqual([width, height], [32, 64]);
        assert.equal(orientation, undefined);
    });

    it('never enlarges an original smaller than the requested box', async () => {
        await run(
            { square: { width: 128, height: 128, fit: 'cover' } },
            await aGradient(40, 20),
        );

        const { width, height } = await metadata('square.webp');

        assert.deepEqual([width, height], [40, 20]);
    });

    it('keeps the size of the original for a conversion that only changes the format', async () => {
        await run({ copy: {} });

        const { width, height } = await metadata('copy.webp');

        assert.deepEqual([width, height], [200, 100]);
    });

    it('keeps a png conversion lossless when no quality is asked for', async () => {
        const original = await aGradient(64, 64);

        await run({ copy: { format: 'png' } }, original);

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

    it('quantises a png to a palette when a quality is asked for', async () => {
        await run(
            { small: { format: 'png', quality: 50 } },
            await aGradient(64, 64),
        );

        assert.equal((await metadata('small.png')).isPalette, true);
    });

    describe('a transparent original', () => {
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
            await run({ flat: { format: 'jpeg' } }, await transparent());

            const pixels = await sharp(output('flat.jpg')).raw().toBuffer();

            assert.ok(
                Math.min(...pixels) >= 250,
                'libvips flattens alpha onto black unless told otherwise',
            );
        });

        it('stays transparent in a format that carries alpha', async () => {
            await run({ clear: {} }, await transparent());

            assert.equal((await metadata('clear.webp')).hasAlpha, true);
        });
    });

    it('converts one at a time, in the order they are declared', async () => {
        await run({ first: {}, second: {} });

        assert.deepEqual(history, [
            'first:PROCESSING:1',
            'first:DONE:1',
            'second:PROCESSING:1',
            'second:DONE:1',
        ]);
    });

    it('does nothing for a collection without conversions', async () => {
        await run({});

        assert.equal(updates.length, 0);
        assert.equal(files.size, 0);
    });
});

describe('ConversionWorker.run, when it fails', () => {
    it('fails a broken image at once, since trying again cannot fix it', async () => {
        await run({ square: {} }, Buffer.from('not an image'));

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:FAILED:1']);
        assert.equal(delay.mock.callCount(), 0);
        assert.deepEqual(logged, [
            `Cannot convert ${directory}/square.webp, so it is not tried again`,
        ]);
    });

    it('fails a spec sharp refuses at once', async () => {
        await run({ broken: { width: 0 } });

        assert.deepEqual(history, ['broken:PROCESSING:1', 'broken:FAILED:1']);
    });

    it('retries a storage failure after a delay that grows each time', async () => {
        let failures = 2;
        storage.put.mock.mockImplementation(async ({ path, buffer }) => {
            if (failures-- > 0) throw new Error('ECONNRESET');
            files.set(path, buffer);
        });

        await run({ square: {} });

        assert.deepEqual(history, [
            'square:PROCESSING:1',
            'square:PROCESSING:2',
            'square:PROCESSING:3',
            'square:DONE:3',
        ]);
        assert.deepEqual(
            delay.mock.calls.map(({ arguments: [ms] }) => ms),
            [1_000, 2_000],
        );
        assert.ok(files.has(`${directory}/square.webp`));
    });

    it('records FAILED after the third storage failure, and logs the path', async () => {
        storage.put.mock.mockImplementation(async () => {
            throw new Error('ECONNRESET');
        });

        await run({ square: {} });

        assert.deepEqual(history, [
            'square:PROCESSING:1',
            'square:PROCESSING:2',
            'square:PROCESSING:3',
            'square:FAILED:3',
        ]);
        assert.deepEqual(
            delay.mock.calls.map(({ arguments: [ms] }) => ms),
            [1_000, 2_000],
        );
        assert.deepEqual(logged, [
            `Gave up converting ${directory}/square.webp after 3 attempts`,
        ]);
    });

    it('carries on with the next conversion after one fails', async () => {
        await run({ broken: { width: 0 }, square: {} });

        assert.equal(history.at(-1), 'square:DONE:1');
        assert.ok(files.has(`${directory}/square.webp`));
    });

    it('never rejects, even when no state can be recorded', async () => {
        reachDatabase.mock.mockImplementation(() => {
            throw new Error('connection terminated');
        });

        await assert.doesNotReject(run({ square: {}, banner: {} }));

        assert.deepEqual(logged, [
            `Could not record the state of square for media ${uuid}`,
            `Could not record the state of banner for media ${uuid}`,
        ]);
        assert.equal(storage.put.mock.callCount(), 0);
    });
});

describe('ConversionWorker.run, resuming', () => {
    it('resumes a conversion a stopped process left PROCESSING, as its next attempt', async () => {
        await worker.run({
            media: aMedia({
                square: aState({
                    status: ConversionStatus.Processing,
                    attempts: 1,
                    startedAt: minutesAgo(10),
                }),
            }),
            original: photo,
        });

        assert.deepEqual(history, ['square:PROCESSING:2', 'square:DONE:2']);
    });

    it('fails a conversion abandoned during its last attempt, without converting it', async () => {
        await worker.run({
            media: aMedia({
                square: aState({
                    status: ConversionStatus.Processing,
                    attempts: 3,
                    startedAt: minutesAgo(10),
                }),
            }),
            original: photo,
        });

        assert.deepEqual(history, ['square:FAILED:3']);
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('leaves alone a conversion another process started less than five minutes ago', async () => {
        await worker.run({
            media: aMedia({
                square: aState({
                    status: ConversionStatus.Processing,
                    attempts: 1,
                    startedAt: minutesAgo(4),
                }),
            }),
            original: photo,
        });

        assert.equal(updates.length, 0);
    });

    it('leaves alone a conversion that is DONE or FAILED', async () => {
        await worker.run({
            media: aMedia({
                done: aState({ status: ConversionStatus.Done, attempts: 1 }),
                failed: aState({
                    status: ConversionStatus.Failed,
                    attempts: 3,
                }),
            }),
            original: photo,
        });

        assert.equal(updates.length, 0);
    });

    it('reads the original from storage when it is not in memory', async () => {
        files.set(`${directory}/original.png`, photo);

        await worker.run({ media: aMedia({ square: aState() }) });

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:DONE:1']);
        assert.ok(files.has(`${directory}/square.webp`));
    });

    it('counts an original it cannot read as a failed attempt', async () => {
        await worker.run({ media: aMedia({ square: aState() }) });

        assert.deepEqual(history, [
            'square:PROCESSING:1',
            'square:PROCESSING:2',
            'square:PROCESSING:3',
            'square:FAILED:3',
        ]);
    });

    it('stops when another process claims the conversion first', async () => {
        const media = aMedia({ square: aState() });
        rows.set(uuid, {
            square: aState({
                status: ConversionStatus.Processing,
                attempts: 1,
                startedAt: minutesAgo(0),
            }),
        });

        await worker.run({ media, original: photo });

        assert.deepEqual(history, []);
        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('does not convert for a media that no longer exists', async () => {
        const media = aMedia({ square: aState() });
        rows.delete(uuid);

        await worker.run({ media, original: photo });

        assert.equal(storage.put.mock.callCount(), 0);
    });

    it('leaves no file behind for a media deleted while it was converting', async () => {
        storage.put.mock.mockImplementation(async ({ path, buffer }) => {
            files.set(path, buffer);
            // deleted, with its directory, while the conversion was being stored
            rows.delete(uuid);
        });

        await run({ square: {} });

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

        await run({ square: {} });

        assert.ok(files.has(`${directory}/square.webp`));
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
        assert.deepEqual(options.order, { createdAt: 'ASC' });
        assert.equal(options.take, 50);
        assert.equal(parameters?.pending, '{"status":"PENDING"}');
        assert.equal(parameters?.processing, '{"status":"PROCESSING"}');
        assert.ok(
            staleBefore >= before - 5 * MINUTE &&
                staleBefore <= Date.now() - 5 * MINUTE,
        );
    });

    it('converts what it finds from the original in storage', async () => {
        files.set(`${directory}/original.png`, photo);
        repository.find.mock.mockImplementation(async () => [
            aMedia({ square: aState() }),
        ]);

        await worker.sweep();

        assert.deepEqual(history, ['square:PROCESSING:1', 'square:DONE:1']);
    });
});

describe('ConversionWorker sweeping', () => {
    const settle = () => new Promise((resolve) => setImmediate(resolve));

    it('sweeps at boot, then every minute', async () => {
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

    it('starts no sweep while one is still running', async () => {
        mock.timers.enable({ apis: ['setInterval'] });
        repository.find.mock.mockImplementation(() => new Promise(() => {}));

        worker.onApplicationBootstrap();
        mock.timers.tick(MINUTE);
        await settle();

        assert.equal(repository.find.mock.callCount(), 1);
    });

    it('waits on shutdown for a conversion in progress, which records its outcome', async () => {
        let release = () => {};

        storage.put.mock.mockImplementationOnce(
            ({ path, buffer }) =>
                new Promise((resolve) => {
                    release = () => {
                        files.set(path, buffer);
                        resolve();
                    };
                }),
        );

        const converting = run({ square: { width: 64 } });
        // sharp works off the event loop, so wait until it hands the result to storage
        while (storage.put.mock.callCount() === 0) await settle();

        let done = false;
        const stopped = worker.onModuleDestroy().then(() => {
            done = true;
        });

        await settle();
        assert.equal(
            done,
            false,
            'shutdown finished before the conversion did',
        );

        release();
        await stopped;
        await converting;
        assert.deepEqual(history, ['square:PROCESSING:1', 'square:DONE:1']);
    });

    it('waits for a running sweep on shutdown, which converts nothing more', async () => {
        mock.timers.enable({ apis: ['setInterval'] });
        let release = () => {};
        files.set(`${directory}/original.png`, photo);
        repository.find.mock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () => resolve([aMedia({ square: aState() })]);
                }),
        );

        worker.onApplicationBootstrap();
        const stopped = worker.onModuleDestroy();
        release();
        await stopped;

        assert.equal(updates.length, 0);
    });
});
