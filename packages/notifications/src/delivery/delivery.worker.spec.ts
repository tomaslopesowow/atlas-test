import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type FindOperator, MoreThan } from 'typeorm';
import type { INotificationChannel } from '../channels/channel.interface.js';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import {
    hasUnfinishedDelivery,
    NotificationEntity,
} from '../entities/notification.entity.js';
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

/** How many minutes from now an ISO time is, to the nearest minute. */
const minutesFromNow = (time?: string) =>
    Math.round((Date.parse(String(time)) - Date.now()) / MINUTE);

const transient = (): DeliveryResult => ({
    status: DeliveryStatus.Failed,
    error: new Error('ECONNRESET'),
});

/** The notification ids of each batch the channel was asked to send. */
const batches = (channel: typeof push) =>
    channel.send.mock.calls.map(({ arguments: [{ deliveries }] }) =>
        deliveries.map(({ notificationId }) => notificationId),
    );

const settle = () => new Promise((resolve) => setImmediate(resolve));

/** Holds every push send until the returned function lets it through as SENT. */
const holdSends = () => {
    let respond = () => {};

    push.send.mock.mockImplementation(
        ({ deliveries }) =>
            new Promise((resolve) => {
                respond = () =>
                    resolve(
                        deliveries.map(() => ({ status: DeliveryStatus.Sent })),
                    );
            }),
    );

    return () => respond();
};

let logged: string[];
let worker: DeliveryWorker;

/** Sweeps once, finding these notifications. */
const sweep = async (...notifications: NotificationEntity[]) => {
    repository.find.mock.mockImplementationOnce(async () => notifications);
    await worker.sweep();
};

beforeEach(async () => {
    rows.clear();
    history.length = 0;
    updates.length = 0;
    logged = [];
    enabled.clear();
    enabled.set('push', push);
    enabled.set('mail', mail);

    for (const fn of [reachDatabase, repository.find, push.send, mail.send]) {
        fn.mock.restore();
        fn.mock.resetCalls();
    }

    mock.method(Logger.prototype, 'error', (text: unknown) => {
        logged.push(String(text));
    });

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
});

describe('DeliveryWorker delivering', () => {
    it('sends each delivery with its notification id, owner and message', async () => {
        const notification = aNotification({ push: aState() });

        await sweep(notification);

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

        await sweep(aNotification({ push: aState() }));

        const { startedAt, ...state } = rows.get(anId(1))?.push ?? aState();

        assert.deepEqual(history, ['push:PROCESSING:1', 'push:SENT:1']);
        assert.deepEqual(
            state,
            aState({ status: DeliveryStatus.Sent, attempts: 1 }),
        );
        assert.ok(startedAt && Date.parse(startedAt) >= before);
    });

    it('writes only the state into its own key, only from the state it read, with every placeholder bound', async () => {
        await sweep(aNotification({ push: aState() }));

        const [claim] = updates;
        assert.ok(claim);
        assert.ok(updates.every(({ to }) => !('message' in to)));

        const sql = [
            (claim.values.deliveries as () => string)(),
            ...claim.conditions,
        ].join(' ');

        assert.equal(claim.target, NotificationEntity);
        assert.deepEqual(Object.keys(claim.values), ['deliveries']);
        assert.match(sql, /^jsonb_set\("deliveries", /);
        assert.match(sql, /id = ANY\(CAST\(:ids AS uuid\[\]\)\)/);
        assert.match(sql, /"deliveries" -> CAST\(:name AS text\) @> /);
        assert.match(
            sql,
            /\("deliveries" -> CAST\(:name AS text\)\) \|\| CAST\(:to AS jsonb\)/,
            'merged into the delivery, which keeps its message',
        );
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

    it('delivers each channel in parallel', async () => {
        let mailStarted = false;
        push.send.mock.mockImplementation(async ({ deliveries }) => {
            await new Promise((resolve) => setImmediate(resolve));
            mailStarted = mail.send.mock.callCount() === 1;

            return deliveries.map(() => ({ status: DeliveryStatus.Sent }));
        });

        await sweep(aNotification({ push: aState(), mail: aState() }));

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

        await sweep(
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

    it('skips without sending the deliveries of a channel config has since switched off', async () => {
        enabled.delete('push');

        await sweep(aNotification({ push: aState() }));

        assert.deepEqual(history, ['push:SKIPPED:0']);
        assert.equal(push.send.mock.callCount(), 0);
        assert.deepEqual(rows.get(anId(1))?.push?.message, message);
    });
});

describe('DeliveryWorker, when a delivery fails', () => {
    it('fails an undeliverable delivery at once, since trying again cannot help', async () => {
        push.send.mock.mockImplementation(
            sendAll({
                status: DeliveryStatus.Failed,
                error: new UndeliverableError('address rejected'),
            }),
        );

        await sweep(aNotification({ push: aState() }));

        assert.deepEqual(history, ['push:PROCESSING:1', 'push:FAILED:1']);
        assert.equal(push.send.mock.callCount(), 1);
        assert.deepEqual(logged, [
            `Cannot deliver push of notification ${anId(1)}, so it is not tried again`,
        ]);
    });

    it('puts any other failure back as PENDING, due a minute later, rather than retrying while the provider is down', async () => {
        push.send.mock.mockImplementation(sendAll(transient()));

        await sweep(aNotification({ push: aState() }));

        assert.deepEqual(history, ['push:PROCESSING:1', 'push:PENDING:1']);
        assert.equal(push.send.mock.callCount(), 1);
        assert.equal(minutesFromNow(rows.get(anId(1))?.push?.retryAt), 1);
        assert.deepEqual(rows.get(anId(1))?.push?.message, message);
    });

    it('waits 1, 5, 30 and then 120 minutes after each failure', async () => {
        push.send.mock.mockImplementation(sendAll(transient()));

        for (const attempts of [0, 1, 2, 3])
            await sweep(
                aNotification(
                    { push: aState({ attempts, retryAt: minutesAgo(1) }) },
                    anId(attempts),
                ),
            );

        assert.deepEqual(
            [0, 1, 2, 3].map((n) =>
                minutesFromNow(rows.get(anId(n))?.push?.retryAt),
            ),
            [1, 5, 30, 120],
        );
    });

    it('records FAILED after the fifth failure, and logs which delivery', async () => {
        push.send.mock.mockImplementation(sendAll(transient()));

        await sweep(
            aNotification({
                push: aState({ attempts: 4, retryAt: minutesAgo(1) }),
            }),
        );

        assert.deepEqual(history, ['push:PROCESSING:5', 'push:FAILED:5']);
        assert.deepEqual(logged, [
            `Gave up delivering push of notification ${anId(1)} after 5 attempts`,
        ]);
    });

    it('counts a send that throws as a failure of every delivery in it', async () => {
        push.send.mock.mockImplementationOnce(async () => {
            throw new Error('socket hang up');
        });

        await sweep(
            aNotification({ push: aState() }, anId(1)),
            aNotification({ push: aState() }, anId(2)),
        );

        assert.deepEqual(history, [
            'push:PROCESSING:1',
            'push:PROCESSING:1',
            'push:PENDING:1',
            'push:PENDING:1',
        ]);
    });

    it('logs, rather than rejects, when no state can be recorded', async () => {
        reachDatabase.mock.mockImplementation(() => {
            throw new Error('connection terminated');
        });

        await assert.doesNotReject(
            sweep(aNotification({ push: aState(), mail: aState() })),
        );

        assert.deepEqual([...logged].sort(), [
            'Could not record the mail deliveries',
            'Could not record the push deliveries',
        ]);
        assert.equal(push.send.mock.callCount(), 0);
    });
});

describe('DeliveryWorker, while a batch is out', () => {
    it('renews its claim every 100 seconds, so however slow the provider, no other process takes it over', async () => {
        mock.timers.enable({ apis: ['setInterval'] });
        const respond = holdSends();

        const running = sweep(aNotification({ push: aState() }));
        await settle();
        const claimedAt = rows.get(anId(1))?.push?.startedAt;

        mock.timers.tick(100_000);
        await settle();

        const renewal = updates.at(-1);
        assert.deepEqual(Object.keys(renewal?.to ?? {}), ['startedAt']);
        assert.deepEqual(JSON.parse(String(renewal?.parameters.from)), {
            status: DeliveryStatus.Processing,
            attempts: 1,
        });
        assert.ok(
            String(rows.get(anId(1))?.push?.startedAt) >= String(claimedAt),
        );

        respond();
        await running;
        const recorded = updates.length;
        mock.timers.tick(100_000);

        assert.equal(updates.length, recorded, 'renewed after it was recorded');
        assert.equal(rows.get(anId(1))?.push?.status, DeliveryStatus.Sent);
    });

    it('waits on shutdown for the batch out with a provider, and records it', async () => {
        const respond = holdSends();
        repository.find.mock.mockImplementationOnce(async () => [
            aNotification({ push: aState() }),
        ]);

        worker.startSweep();
        await settle();
        const stopped = worker.onModuleDestroy();
        respond();
        await stopped;

        assert.equal(rows.get(anId(1))?.push?.status, DeliveryStatus.Sent);
    });
});

describe('DeliveryWorker, resuming', () => {
    it('resumes a delivery a stopped process left PROCESSING, as its next attempt', async () => {
        await sweep(
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
        await sweep(
            aNotification({
                push: aState({
                    status: DeliveryStatus.Processing,
                    attempts: 5,
                    startedAt: minutesAgo(10),
                }),
            }),
        );

        assert.deepEqual(history, ['push:FAILED:5']);
        assert.equal(push.send.mock.callCount(), 0);
        assert.deepEqual(logged, [
            `Gave up delivering push of notification ${anId(1)} after 5 attempts`,
        ]);
    });

    it('leaves alone what is not due, started by another process under five minutes ago, or finished', async () => {
        await sweep(
            aNotification({
                push: aState({
                    attempts: 1,
                    retryAt: new Date(Date.now() + MINUTE).toISOString(),
                }),
                mail: aState({
                    status: DeliveryStatus.Processing,
                    attempts: 1,
                    startedAt: minutesAgo(4),
                }),
                // the sweep would not find one without a start time either
                sms: aState({ status: DeliveryStatus.Processing, attempts: 1 }),
            }),
            aNotification(
                {
                    push: aState({ status: DeliveryStatus.Sent, attempts: 1 }),
                    mail: aState({
                        status: DeliveryStatus.Failed,
                        attempts: 3,
                    }),
                    sms: aState({ status: DeliveryStatus.Skipped }),
                },
                anId(2),
            ),
        );

        assert.equal(updates.length, 0);
    });

    it('claims each starting state with its own UPDATE, and sends them together', async () => {
        await sweep(
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

    it('sends nothing when another process claims the delivery first', async () => {
        const notification = aNotification({ push: aState() });
        rows.set(notification.id, {
            push: aState({
                status: DeliveryStatus.Processing,
                attempts: 1,
                startedAt: minutesAgo(0),
            }),
        });

        await sweep(notification);

        assert.deepEqual(history, []);
        assert.equal(push.send.mock.callCount(), 0);
    });

    it('sends only the deliveries it claimed', async () => {
        const taken = aNotification({ push: aState() }, anId(2));
        rows.set(taken.id, {
            push: aState({ status: DeliveryStatus.Sent, attempts: 1 }),
        });

        await sweep(aNotification({ push: aState() }, anId(1)), taken);

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

        await sweep(aNotification({ push: aState() }));

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

    it('looks for notifications with a PENDING delivery that is due or one PROCESSING for over five minutes, oldest first', async () => {
        const before = Date.now();

        await worker.sweep();

        const options = findOptions(0);
        const { type, objectLiteralParameters: parameters } =
            options.where.deliveries;
        const staleBefore = (parameters?.staleBefore as Date).getTime();
        const sql = options.where.deliveries.getSql?.('"deliveries"') ?? '';

        assert.equal(type, 'raw');
        assert.ok(
            sql.startsWith(hasUnfinishedDelivery('"deliveries"')),
            "without the index's own condition, Postgres scans every notification",
        );
        assert.match(
            sql,
            /AND EXISTS \(\s*SELECT 1 FROM jsonb_each\("deliveries"\)/,
        );
        assert.match(sql, /'retryAt' AS timestamptz\) <= :now/);
        assert.ok(
            (parameters?.now as Date).getTime() >= before &&
                (parameters?.now as Date).getTime() <= Date.now(),
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
        assert.deepEqual(
            updates.map(
                ({ parameters }) => (parameters.ids as string[]).length,
            ),
            [50, 50, 1, 1],
            'each batch is claimed only once the one before it is recorded',
        );
    });
});

describe('DeliveryWorker sweeping', () => {
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

    it('sweeps once more after the running sweep when asked meanwhile, rather than a minute later', async () => {
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
        assert.equal(repository.find.mock.callCount(), 1);

        release();
        for (let turn = 0; turn < 3; turn++) await settle();

        assert.equal(repository.find.mock.callCount(), 2);
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

    it('waits on shutdown for the running sweep to deliver the batch it found, and looks for no other', async () => {
        let release = () => {};
        repository.find.mock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () =>
                        resolve(
                            Array.from({ length: 50 }, (_, n) =>
                                aNotification({ push: aState() }, anId(n)),
                            ),
                        );
                }),
        );

        worker.startSweep();
        const stopped = worker.onModuleDestroy();
        release();
        await stopped;

        assert.equal(rows.get(anId(49))?.push?.status, DeliveryStatus.Sent);
        assert.equal(repository.find.mock.callCount(), 1);
    });
});
