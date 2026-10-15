import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import timers from 'node:timers/promises';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type FindOperator, MoreThan } from 'typeorm';
import type { INotificationChannel } from '../channels/channel.interface.js';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import { NotificationEntity } from '../entities/notification.entity.js';
import {
    type ChannelSendInput,
    type Deliveries,
    type DeliveryResult,
    type DeliveryState,
    DeliveryStatus,
    type NameInput,
} from '../types/types.js';
import { DeliveryWorker } from './delivery.worker.js';
import { UndeliverableError } from './undeliverable.error.js';

const MINUTE = 60_000;
const message = { title: 'Invoice paid', body: 'Thank you' };

const anId = (n: number) =>
    `01926d3a-7c1e-7cc2-a0a9-${String(n).padStart(12, '0')}`;

/** The deliveries column of each notification row, which the fake UPDATE reads and writes. */
const rows = new Map<string, Deliveries>();

/** Every state the worker moved a delivery to, in order, as `channel:STATUS:attempts`. */
const history: string[] = [];

const updates: FakeUpdate[] = [];

/** Throws to stand in for a database that cannot be reached. */
const reachDatabase = mock.fn((): void => {});

class FakeUpdate {
    target: unknown;
    values: Record<string, unknown> = {};
    returned: unknown;
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

    returning(columns: unknown) {
        this.returned = columns;
        return this;
    }

    get to() {
        return JSON.parse(String(this.parameters.to)) as Partial<DeliveryState>;
    }

    /** As Postgres would: each row must exist and, when the UPDATE checks it, its delivery still hold the state the worker read. */
    async execute() {
        updates.push(this);
        reachDatabase();

        const { ids, name, from } = this.parameters as {
            ids: string[];
            name: string;
            from: string;
        };
        const expected = JSON.parse(from) as DeliveryState;
        const checked = this.conditions.includes(
            '"deliveries" -> CAST(:name AS text) @> CAST(:from AS jsonb)',
        );
        const raw: { id: string }[] = [];

        for (const id of ids) {
            const deliveries = rows.get(id);
            const current = deliveries?.[name];

            if (
                !deliveries ||
                (checked &&
                    (current?.status !== expected.status ||
                        current.attempts !== expected.attempts))
            )
                continue;

            const next = { ...current, ...this.to } as DeliveryState;
            deliveries[name] = next;
            history.push(`${name}:${next.status}:${next.attempts}`);
            raw.push({ id });
        }

        return { raw, affected: raw.length };
    }
}

const repository = {
    createQueryBuilder: () => new FakeUpdate(),
    find: mock.fn(
        async (_options: unknown): Promise<NotificationEntity[]> => [],
    ),
};

const sendAll =
    (result: DeliveryResult) =>
    async ({ deliveries }: ChannelSendInput) =>
        deliveries.map(() => result);

const aChannel = () => ({
    render: async () => message,
    send: mock.fn(sendAll({ status: DeliveryStatus.Sent })),
});

const push = aChannel();
const mail = aChannel();

/** The channels config switches on, by name. */
const enabled = new Map<string, INotificationChannel>();

const explorer = {
    channel: ({ name }: NameInput) => enabled.get(name),
};

/** A notification row whose deliveries are in the given states, as the worker would load it. */
const aNotification = (deliveries: Deliveries, id = anId(1)) => {
    rows.set(id, structuredClone(deliveries));

    return Object.assign(new NotificationEntity(), {
        id,
        modelType: 'user',
        modelId: 5,
        type: 'invoice.paid',
        payload: {},
        inbox: true,
        readAt: null,
        deliveries: structuredClone(deliveries),
        createdAt: new Date('2026-01-01'),
    });
};

const aState = (overrides: Partial<DeliveryState> = {}): DeliveryState => ({
    message,
    status: DeliveryStatus.Pending,
    attempts: 0,
    ...overrides,
});

const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * MINUTE).toISOString();

const transient = (): DeliveryResult => ({
    status: DeliveryStatus.Failed,
    error: new Error('ECONNRESET'),
});

/** The notification ids of each batch the channel was asked to send. */
const batches = (channel: typeof push) =>
    channel.send.mock.calls.map(({ arguments: [{ deliveries }] }) =>
        deliveries.map(({ notificationId }) => notificationId),
    );

const delay = mock.fn(async (_ms?: number): Promise<void> => undefined);

const delays = () => delay.mock.calls.map(({ arguments: [ms] }) => ms);

let logged: string[];
let worker: DeliveryWorker;

const run = (...notifications: NotificationEntity[]) =>
    worker.run({ notifications });

beforeEach(async () => {
    rows.clear();
    history.length = 0;
    updates.length = 0;
    logged = [];
    enabled.clear();
    enabled.set('push', push);
    enabled.set('mail', mail);

    for (const fn of [
        reachDatabase,
        delay,
        repository.find,
        push.send,
        mail.send,
    ]) {
        fn.mock.restore();
        fn.mock.resetCalls();
    }

    mock.method(Logger.prototype, 'error', (text: unknown) => {
        logged.push(String(text));
    });

    // the worker imports setTimeout by name, which only follows a patch once re-synced
    mock.method(timers, 'setTimeout', delay);
    syncBuiltinESMExports();

    const module = await Test.createTestingModule({
        providers: [
            DeliveryWorker,
            {
                provide: getRepositoryToken(NotificationEntity),
                useValue: repository,
            },
            { provide: NotificationsExplorer, useValue: explorer },
        ],
    }).compile();

    worker = module.get(DeliveryWorker);
});

afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
    syncBuiltinESMExports();
});

describe('DeliveryWorker.run', () => {
    it('sends each delivery with its notification id, owner and message', async () => {
        const notification = aNotification({ push: aState() });

        await run(notification);

        assert.deepEqual(push.send.mock.calls[0]?.arguments, [
            {
                deliveries: [
                    {
                        notificationId: notification.id,
                        owner: { modelType: 'user', modelId: 5 },
                        message,
                    },
                ],
            },
        ]);
    });

    it('records PROCESSING, with when it started, and then SENT', async () => {
        const before = Date.now();

        await run(aNotification({ push: aState() }));

        const { startedAt, ...state } = rows.get(anId(1))?.push ?? aState();

        assert.deepEqual(history, ['push:PROCESSING:1', 'push:SENT:1']);
        assert.deepEqual(
            state,
            aState({ status: DeliveryStatus.Sent, attempts: 1 }),
        );
        assert.ok(startedAt && Date.parse(startedAt) >= before);
    });

    it('claims the deliveries of many notifications with one UPDATE, and sends them as one batch', async () => {
        const notifications = [1, 2, 3].map((n) =>
            aNotification({ push: aState() }, anId(n)),
        );

        await run(...notifications);

        assert.equal(updates.length, 2, 'one claim, one outcome');
        assert.deepEqual(updates[0]?.parameters.ids, [
            anId(1),
            anId(2),
            anId(3),
        ]);
        assert.deepEqual(batches(push), [[anId(1), anId(2), anId(3)]]);
    });

    it('claims, sends and records a large send 100 at a time, so a claim never has to outlast more than one batch', async () => {
        const notifications = Array.from({ length: 250 }, (_, n) =>
            aNotification({ push: aState() }, anId(n + 1)),
        );

        await run(...notifications);

        assert.deepEqual(
            batches(push).map((batch) => batch.length),
            [100, 100, 50],
        );
        assert.deepEqual(
            updates.map(
                ({ parameters }) => (parameters.ids as string[]).length,
            ),
            [100, 100, 100, 100, 50, 50],
            'each batch is claimed only once the one before it is recorded',
        );
    });

    it('writes only its own key, only from the state it read, with every placeholder bound', async () => {
        await run(aNotification({ push: aState() }));

        const [claim] = updates;
        assert.ok(claim);

        const sql = [
            (claim.values.deliveries as () => string)(),
            ...claim.conditions,
        ].join(' ');

        assert.equal(claim.target, NotificationEntity);
        assert.deepEqual(Object.keys(claim.values), ['deliveries']);
        assert.match(sql, /^jsonb_set\("deliveries", /);
        assert.match(sql, /id = ANY\(CAST\(:ids AS uuid\[\]\)\)/);
        assert.match(sql, /"deliveries" -> CAST\(:name AS text\) @> /);
        assert.equal(claim.returned, 'id');
        assert.equal(claim.parameters.name, 'push');
        assert.deepEqual(JSON.parse(String(claim.parameters.from)), {
            status: DeliveryStatus.Pending,
            attempts: 0,
        });

        // a `::type` cast is not a placeholder
        for (const [, name] of sql.matchAll(/(?<!:):(?:\.\.\.)?(\w+)/g))
            assert.ok(
                name && Object.hasOwn(claim.parameters, name),
                `:${name} has no value`,
            );
    });

    it('keeps the stored message, merging only the state into the delivery', async () => {
        await run(aNotification({ push: aState() }));

        assert.match(
            (updates[0]?.values.deliveries as () => string)(),
            /\("deliveries" -> CAST\(:name AS text\)\) \|\| CAST\(:to AS jsonb\)/,
        );
        assert.ok(updates.every(({ to }) => !('message' in to)));
        assert.deepEqual(rows.get(anId(1))?.push?.message, message);
    });

    it('delivers each channel in parallel', async () => {
        let mailStarted = false;
        push.send.mock.mockImplementation(async ({ deliveries }) => {
            await new Promise((resolve) => setImmediate(resolve));
            mailStarted = mail.send.mock.callCount() === 1;

            return deliveries.map(() => ({ status: DeliveryStatus.Sent }));
        });

        await run(aNotification({ push: aState(), mail: aState() }));

        assert.ok(mailStarted, 'mail waited for push to finish');
        assert.deepEqual([...history].sort(), [
            'mail:PROCESSING:1',
            'mail:SENT:1',
            'push:PROCESSING:1',
            'push:SENT:1',
        ]);
    });

    it('records each outcome by position, one UPDATE per outcome', async () => {
        const undeliverable = new UndeliverableError('rejected');
        push.send.mock.mockImplementation(async () => [
            { status: DeliveryStatus.Sent },
            { status: DeliveryStatus.Skipped },
            { status: DeliveryStatus.Sent },
            { status: DeliveryStatus.Failed, error: undeliverable },
        ]);

        await run(
            ...[1, 2, 3, 4].map((n) =>
                aNotification({ push: aState() }, anId(n)),
            ),
        );

        assert.deepEqual(
            [1, 2, 3, 4].map((n) => rows.get(anId(n))?.push?.status),
            [
                DeliveryStatus.Sent,
                DeliveryStatus.Skipped,
                DeliveryStatus.Sent,
                DeliveryStatus.Failed,
            ],
        );
        assert.deepEqual(
            updates
                .slice(1)
                .map(({ to, parameters }) => [to.status, parameters.ids]),
            [
                [DeliveryStatus.Sent, [anId(1), anId(3)]],
                [DeliveryStatus.Skipped, [anId(2)]],
                [DeliveryStatus.Failed, [anId(4)]],
            ],
        );
    });

    it('sends nothing for a channel whose deliveries are all done', async () => {
        await run(
            aNotification({
                push: aState(),
                mail: aState({ message: null, status: DeliveryStatus.Skipped }),
            }),
        );

        assert.equal(mail.send.mock.callCount(), 0);
        assert.deepEqual(history, ['push:PROCESSING:1', 'push:SENT:1']);
    });

    it('skips without sending the deliveries of a channel config has since switched off', async () => {
        enabled.delete('push');

        await run(aNotification({ push: aState() }));

        assert.deepEqual(history, ['push:SKIPPED:0']);
        assert.equal(push.send.mock.callCount(), 0);
        assert.deepEqual(rows.get(anId(1))?.push?.message, message);
    });

    it('does nothing for no notifications', async () => {
        await run();

        assert.equal(updates.length, 0);
    });
});

describe('DeliveryWorker.run, when it fails', () => {
    it('fails an undeliverable delivery at once, since trying again cannot help', async () => {
        push.send.mock.mockImplementation(
            sendAll({
                status: DeliveryStatus.Failed,
                error: new UndeliverableError('address rejected'),
            }),
        );

        await run(aNotification({ push: aState() }));

        assert.deepEqual(history, ['push:PROCESSING:1', 'push:FAILED:1']);
        assert.equal(push.send.mock.callCount(), 1);
        assert.equal(delay.mock.callCount(), 0);
        assert.deepEqual(logged, [
            `Cannot deliver push of notification ${anId(1)}, so it is not tried again`,
        ]);
    });

    it('retries any other failure after a delay that grows each time', async () => {
        let failures = 2;
        push.send.mock.mockImplementation(async ({ deliveries }) =>
            deliveries.map(() =>
                failures-- > 0 ? transient() : { status: DeliveryStatus.Sent },
            ),
        );

        await run(aNotification({ push: aState() }));

        assert.deepEqual(history, [
            'push:PROCESSING:1',
            'push:PROCESSING:2',
            'push:PROCESSING:3',
            'push:SENT:3',
        ]);
        assert.deepEqual(delays(), [1_000, 2_000]);
    });

    it('records FAILED after the third failure, and logs which delivery', async () => {
        push.send.mock.mockImplementation(sendAll(transient()));

        await run(aNotification({ push: aState() }));

        assert.deepEqual(history, [
            'push:PROCESSING:1',
            'push:PROCESSING:2',
            'push:PROCESSING:3',
            'push:FAILED:3',
        ]);
        assert.deepEqual(delays(), [1_000, 2_000]);
        assert.deepEqual(logged, [
            `Gave up delivering push of notification ${anId(1)} after 3 attempts`,
        ]);
    });

    it('retries only the deliveries that failed', async () => {
        push.send.mock.mockImplementationOnce(async () => [
            { status: DeliveryStatus.Sent },
            transient(),
        ]);

        await run(
            aNotification({ push: aState() }, anId(1)),
            aNotification({ push: aState() }, anId(2)),
        );

        assert.deepEqual(batches(push), [[anId(1), anId(2)], [anId(2)]]);
        assert.equal(rows.get(anId(1))?.push?.attempts, 1);
        assert.partialDeepStrictEqual(rows.get(anId(2))?.push, {
            status: DeliveryStatus.Sent,
            attempts: 2,
        });
    });

    it('counts a send that throws as a failure of every delivery in it', async () => {
        push.send.mock.mockImplementationOnce(async () => {
            throw new Error('socket hang up');
        });

        await run(
            aNotification({ push: aState() }, anId(1)),
            aNotification({ push: aState() }, anId(2)),
        );

        assert.deepEqual(batches(push), [
            [anId(1), anId(2)],
            [anId(1), anId(2)],
        ]);
        assert.deepEqual(history, [
            'push:PROCESSING:1',
            'push:PROCESSING:1',
            'push:PROCESSING:2',
            'push:PROCESSING:2',
            'push:SENT:2',
            'push:SENT:2',
        ]);
    });

    it('carries on with the other channels when one fails', async () => {
        push.send.mock.mockImplementation(
            sendAll({
                status: DeliveryStatus.Failed,
                error: new UndeliverableError('no device'),
            }),
        );

        await run(aNotification({ push: aState(), mail: aState() }));

        assert.equal(rows.get(anId(1))?.mail?.status, DeliveryStatus.Sent);
    });

    it('never rejects, even when no state can be recorded', async () => {
        reachDatabase.mock.mockImplementation(() => {
            throw new Error('connection terminated');
        });

        await assert.doesNotReject(
            run(aNotification({ push: aState(), mail: aState() })),
        );

        assert.deepEqual([...logged].sort(), [
            'Could not record the mail deliveries',
            'Could not record the push deliveries',
        ]);
        assert.equal(push.send.mock.callCount(), 0);
    });

    it('stops retrying once shutting down, leaving the delivery to the lease', async () => {
        let stopped: Promise<void> | undefined;

        // started, not awaited: shutdown waits for this very send
        push.send.mock.mockImplementation(async ({ deliveries }) => {
            stopped = worker.onModuleDestroy();

            return deliveries.map(transient);
        });

        await run(aNotification({ push: aState() }));
        await stopped;

        assert.deepEqual(history, ['push:PROCESSING:1']);
        assert.equal(push.send.mock.callCount(), 1);
    });

    it('waits on shutdown for a delivery in progress, which records its outcome', async () => {
        let release = () => {};

        push.send.mock.mockImplementation(
            ({ deliveries }) =>
                new Promise((resolve) => {
                    release = () =>
                        resolve(
                            deliveries.map(() => ({
                                status: DeliveryStatus.Sent,
                            })),
                        );
                }),
        );

        const delivering = run(aNotification({ push: aState() }));
        await new Promise((resolve) => setImmediate(resolve));

        let done = false;
        const stopped = worker.onModuleDestroy().then(() => {
            done = true;
        });

        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(done, false, 'shutdown finished before the delivery did');

        release();
        await stopped;
        await delivering;
        assert.deepEqual(history, ['push:PROCESSING:1', 'push:SENT:1']);
    });
});

describe('DeliveryWorker.run, resuming', () => {
    it('resumes a delivery a stopped process left PROCESSING, as its next attempt', async () => {
        await run(
            aNotification({
                push: aState({
                    status: DeliveryStatus.Processing,
                    attempts: 1,
                    startedAt: minutesAgo(10),
                }),
            }),
        );

        assert.deepEqual(history, ['push:PROCESSING:2', 'push:SENT:2']);
    });

    it('fails a delivery abandoned during its last attempt, without sending it', async () => {
        await run(
            aNotification({
                push: aState({
                    status: DeliveryStatus.Processing,
                    attempts: 3,
                    startedAt: minutesAgo(10),
                }),
            }),
        );

        assert.deepEqual(history, ['push:FAILED:3']);
        assert.equal(push.send.mock.callCount(), 0);
        assert.deepEqual(logged, [
            `Gave up delivering push of notification ${anId(1)} after 3 attempts`,
        ]);
    });

    it('claims each starting state with its own UPDATE, and sends them together', async () => {
        await run(
            aNotification({ push: aState() }, anId(1)),
            aNotification(
                {
                    push: aState({
                        status: DeliveryStatus.Processing,
                        attempts: 1,
                        startedAt: minutesAgo(10),
                    }),
                },
                anId(2),
            ),
        );

        assert.deepEqual(
            updates.slice(0, 2).map(({ parameters }) => parameters.ids),
            [[anId(1)], [anId(2)]],
        );
        assert.deepEqual(batches(push), [[anId(1), anId(2)]]);
        assert.deepEqual(
            [1, 2].map((n) => rows.get(anId(n))?.push?.attempts),
            [1, 2],
        );
    });

    it('leaves alone a delivery another process started less than five minutes ago', async () => {
        await run(
            aNotification({
                push: aState({
                    status: DeliveryStatus.Processing,
                    attempts: 1,
                    startedAt: minutesAgo(4),
                }),
            }),
        );

        assert.equal(updates.length, 0);
    });

    it('leaves alone a PROCESSING delivery without a start time, as the sweep would not find it either', async () => {
        await run(
            aNotification({
                push: aState({
                    status: DeliveryStatus.Processing,
                    attempts: 1,
                }),
            }),
        );

        assert.equal(updates.length, 0);
    });

    it('leaves alone a delivery that is SENT, FAILED or SKIPPED', async () => {
        await run(
            aNotification({
                push: aState({ status: DeliveryStatus.Sent, attempts: 1 }),
                mail: aState({ status: DeliveryStatus.Failed, attempts: 3 }),
                sms: aState({ status: DeliveryStatus.Skipped }),
            }),
        );

        assert.equal(updates.length, 0);
    });

    it('sends nothing when another process claims the delivery first', async () => {
        const notification = aNotification({ push: aState() });
        rows.set(notification.id, {
            push: aState({
                status: DeliveryStatus.Processing,
                attempts: 1,
                startedAt: minutesAgo(0),
            }),
        });

        await run(notification);

        assert.deepEqual(history, []);
        assert.equal(push.send.mock.callCount(), 0);
    });

    it('sends only the deliveries it claimed', async () => {
        const taken = aNotification({ push: aState() }, anId(2));
        rows.set(taken.id, {
            push: aState({ status: DeliveryStatus.Sent, attempts: 1 }),
        });

        await run(aNotification({ push: aState() }, anId(1)), taken);

        assert.deepEqual(batches(push), [[anId(1)]]);
    });

    it('records no outcome over a delivery another process took over meanwhile', async () => {
        push.send.mock.mockImplementation(async ({ deliveries }) => {
            rows.set(anId(1), {
                push: aState({
                    status: DeliveryStatus.Processing,
                    attempts: 2,
                    startedAt: minutesAgo(0),
                }),
            });

            return deliveries.map(() => ({ status: DeliveryStatus.Sent }));
        });

        await run(aNotification({ push: aState() }));

        assert.deepEqual(history, ['push:PROCESSING:1']);
        assert.equal(
            rows.get(anId(1))?.push?.status,
            DeliveryStatus.Processing,
        );
    });
});

describe('DeliveryWorker.sweep', () => {
    type FindOptions = {
        where: { deliveries: FindOperator<unknown>; id?: unknown };
        order: unknown;
        take: number;
    };

    const findOptions = (call: number) =>
        repository.find.mock.calls[call]?.arguments[0] as FindOptions;

    it('looks for notifications with a PENDING delivery or one PROCESSING for over five minutes, oldest first', async () => {
        const before = Date.now();

        await worker.sweep();

        const options = findOptions(0);
        const { type, objectLiteralParameters: parameters } =
            options.where.deliveries;
        const staleBefore = (parameters?.staleBefore as Date).getTime();

        assert.equal(type, 'raw');
        assert.match(
            options.where.deliveries.getSql?.('"deliveries"') ?? '',
            /EXISTS \(\s*SELECT 1 FROM jsonb_each\("deliveries"\)/,
        );
        assert.deepEqual(Object.keys(options.where), ['deliveries']);
        assert.deepEqual(options.order, { id: 'ASC' });
        assert.equal(options.take, 50);
        assert.equal(parameters?.pending, '{"status":"PENDING"}');
        assert.equal(parameters?.processing, '{"status":"PROCESSING"}');
        assert.ok(
            staleBefore >= before - 5 * MINUTE &&
                staleBefore <= Date.now() - 5 * MINUTE,
        );
    });

    it('delivers what it finds', async () => {
        repository.find.mock.mockImplementation(async () => [
            aNotification({ push: aState() }),
        ]);

        await worker.sweep();

        assert.deepEqual(history, ['push:PROCESSING:1', 'push:SENT:1']);
    });

    it('runs 50 at a time, each batch past the last, until one comes back short', async () => {
        const found = [
            Array.from({ length: 50 }, (_, n) =>
                aNotification({ push: aState() }, anId(n)),
            ),
            [aNotification({ push: aState() }, anId(50))],
        ];
        repository.find.mock.mockImplementation(
            async () => found.shift() ?? [],
        );

        await worker.sweep();

        assert.equal(repository.find.mock.callCount(), 2);
        assert.deepEqual(findOptions(1).where.id, MoreThan(anId(49)));
        assert.deepEqual(
            batches(push).map((batch) => batch.length),
            [50, 1],
        );
    });
});

describe('DeliveryWorker sweeping', () => {
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

    it('logs a sweep that fails, and sweeps again a minute later', async () => {
        mock.timers.enable({ apis: ['setInterval'] });
        repository.find.mock.mockImplementationOnce(async () => {
            throw new Error('connection terminated');
        });

        worker.onApplicationBootstrap();
        await settle();
        mock.timers.tick(MINUTE);
        await settle();

        assert.deepEqual(logged, ['Could not sweep for deliveries']);
        assert.equal(repository.find.mock.callCount(), 2);
        await worker.onModuleDestroy();
    });

    it('waits for a running sweep on shutdown, which delivers nothing more', async () => {
        mock.timers.enable({ apis: ['setInterval'] });
        let release = () => {};
        repository.find.mock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () =>
                        resolve([aNotification({ push: aState() })]);
                }),
        );

        worker.onApplicationBootstrap();
        const stopped = worker.onModuleDestroy();
        release();
        await stopped;

        assert.equal(updates.length, 0);
        assert.equal(push.send.mock.callCount(), 0);
    });
});
