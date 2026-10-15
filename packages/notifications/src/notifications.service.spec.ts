import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type DeepPartial, In, IsNull, LessThan } from 'typeorm';
import type { INotificationChannel } from './channels/channel.interface.js';
import { DeliveryWorker } from './delivery/delivery.worker.js';
import { DevicesService } from './devices/devices.service.js';
import { NotificationsExplorer } from './discovery/notifications.explorer.js';
import { NotificationEntity } from './entities/notification.entity.js';
import { Notification } from './notification.js';
import { notificationsConfig } from './notifications.config.js';
import { NotificationService } from './notifications.service.js';
import {
    type ChannelRenderInput,
    type ChannelSendInput,
    type DeliveryResult,
    DeliveryStatus,
    type ModelRef,
    type NameInput,
    type Notifiable,
} from './types/types.js';

class InvoicePaid extends Notification<{ invoiceId: number }> {
    readonly type = 'invoice.paid';

    constructor(readonly channels: readonly string[]) {
        super({ invoiceId: 7 });
    }
}

const UUID_V7 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const owner = { modelType: 'user', modelId: 5 };
const ann: Notifiable = { ...owner, email: 'ann@example.com', locale: 'nl' };
const bob: Notifiable = { modelType: 'user', modelId: 6 };
const guest: Notifiable = { email: 'guest@example.com' };
const id = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';

const aChannel = () => ({
    render: mock.fn(
        async ({ recipient }: ChannelRenderInput): Promise<unknown> => ({
            to: recipient.email ?? recipient.modelId,
        }),
    ),
    send: mock.fn(
        async (_input: ChannelSendInput): Promise<DeliveryResult[]> => [],
    ),
});

const push = aChannel();
const mail = aChannel();

/** Registered channels, by name; one missing from `enabled` is switched off by config. */
const registered = new Map<string, INotificationChannel>([
    ['push', push],
    ['mail', mail],
]);
const enabled = new Map(registered);

const explorer = {
    knows: mock.fn(
        ({ name }: NameInput) => name === 'database' || registered.has(name),
    ),
    channel: mock.fn(({ name }: NameInput) => enabled.get(name)),
};

/** Where the rows are inserted, inside the send's transaction. */
const transactionManager = {
    insert: mock.fn(
        async (_target: unknown, _rows: NotificationEntity[]) => ({}),
    ),
};

const notificationRepository = {
    manager: {
        transaction: mock.fn(
            async (run: (manager: typeof transactionManager) => unknown) =>
                run(transactionManager),
        ),
    },
    create: mock.fn(
        (input: DeepPartial<NotificationEntity>): NotificationEntity =>
            Object.assign(new NotificationEntity(), input),
    ),
    find: mock.fn(
        async (_options: unknown): Promise<NotificationEntity[]> => [],
    ),
    countBy: mock.fn(async (_where: unknown): Promise<number> => 0),
    update: mock.fn(
        async (
            _criteria: unknown,
            _values: unknown,
        ): Promise<{ affected?: number }> => ({ affected: 2 }),
    ),
    delete: mock.fn(
        async (_criteria: unknown): Promise<{ affected?: number }> => ({
            affected: 3,
        }),
    ),
};

const deliveryWorker = {
    startSweep: mock.fn((): void => undefined),
};

const devicesService = {
    unregisterFor: mock.fn(async (_input: ModelRef): Promise<number> => 1),
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

const inserted = () => lastCall(transactionManager.insert)?.[1] ?? [];

const anEntity = (overrides: Partial<NotificationEntity> = {}) =>
    Object.assign(new NotificationEntity(), {
        id,
        ...owner,
        type: 'invoice.paid',
        payload: { invoiceId: 7 },
        inbox: true,
        readAt: null,
        deliveries: {},
        createdAt: new Date('2026-01-01'),
        ...overrides,
    });

let service: NotificationService;

beforeEach(async () => {
    resetMocks(
        push,
        mail,
        explorer,
        notificationRepository,
        notificationRepository.manager,
        transactionManager,
        deliveryWorker,
        devicesService,
    );
    enabled.clear();
    for (const [name, channel] of registered) enabled.set(name, channel);

    const module = await Test.createTestingModule({
        providers: [
            NotificationService,
            {
                provide: getRepositoryToken(NotificationEntity),
                useValue: notificationRepository,
            },
            { provide: NotificationsExplorer, useValue: explorer },
            { provide: DeliveryWorker, useValue: deliveryWorker },
            { provide: DevicesService, useValue: devicesService },
            {
                provide: notificationsConfig.KEY,
                useValue: { defaultLocale: 'en' },
            },
        ],
    }).compile();

    service = module.get(NotificationService);
});

describe('NotificationService.send', () => {
    it('stores nothing for no recipients', async () => {
        const result = await service.send({
            recipients: [],
            notification: new InvoicePaid(['database', 'push']),
        });

        assert.deepEqual(result, { ids: [] });
        assert.equal(push.render.mock.callCount(), 0);
        assert.equal(transactionManager.insert.mock.callCount(), 0);
        assert.equal(deliveryWorker.startSweep.mock.callCount(), 0);
    });

    it('refuses a channel that is not registered, before rendering or storing anything', async () => {
        await assert.rejects(
            service.send({
                recipients: [ann],
                notification: new InvoicePaid(['push', 'fax']),
            }),
            {
                message:
                    '"invoice.paid" lists the channel "fax", which is not registered',
            },
        );
        assert.equal(push.render.mock.callCount(), 0);
        assert.equal(transactionManager.insert.mock.callCount(), 0);
    });

    it('refuses a recipient with half an owner, before rendering or storing anything', async () => {
        for (const recipient of [{ modelType: 'user' }, { modelId: 5 }])
            await assert.rejects(
                service.send({
                    recipients: [ann, recipient],
                    notification: new InvoicePaid(['database', 'push']),
                }),
                {
                    message:
                        'A recipient needs both modelType and modelId, or neither',
                },
                JSON.stringify(recipient),
            );

        assert.equal(push.render.mock.callCount(), 0);
        assert.equal(transactionManager.insert.mock.callCount(), 0);
    });

    it('renders a channel listed twice only once', async () => {
        await service.send({
            recipients: [ann],
            notification: new InvoicePaid(['push', 'database', 'push']),
        });

        assert.equal(push.render.mock.callCount(), 1);
    });

    it('accepts the database channel, which no channel registers', async () => {
        await service.send({
            recipients: [ann],
            notification: new InvoicePaid(['database']),
        });

        assert.deepEqual(inserted()[0]?.deliveries, {});
        assert.equal(explorer.channel.mock.callCount(), 0);
    });

    it('stores a large send in parts of 1000 rows, all in one transaction', async () => {
        const recipients = Array.from({ length: 2_500 }, (_, i) => ({
            modelType: 'user',
            modelId: i + 1,
        }));

        const { ids } = await service.send({
            recipients,
            notification: new InvoicePaid(['database']),
        });

        assert.equal(
            notificationRepository.manager.transaction.mock.callCount(),
            1,
        );
        assert.deepEqual(
            transactionManager.insert.mock.calls.map(
                ({ arguments: [target, rows] }) => [target, rows.length],
            ),
            [
                [NotificationEntity, 1_000],
                [NotificationEntity, 1_000],
                [NotificationEntity, 500],
            ],
            'Postgres takes at most 65,535 parameters a statement',
        );
        assert.deepEqual(
            transactionManager.insert.mock.calls.flatMap(
                ({ arguments: [, rows] }) => rows.map(({ id }) => id),
            ),
            ids,
        );
    });

    it('renders a batch only once the one before it is stored, so a large send never holds every message at once', async () => {
        let rendered = 0;
        const renderedPerInsert: number[] = [];
        push.render.mock.mockImplementation(async () => {
            rendered++;
            return {};
        });
        transactionManager.insert.mock.mockImplementation(async () => {
            renderedPerInsert.push(rendered);
            rendered = 0;
            return {};
        });

        await service.send({
            recipients: Array.from({ length: 2_500 }, (_, i) => ({
                modelType: 'user',
                modelId: i + 1,
            })),
            notification: new InvoicePaid(['push']),
        });

        assert.deepEqual(renderedPerInsert, [1_000, 1_000, 500]);
    });

    it('gives each a UUIDv7, returned in the order of the recipients', async () => {
        const { ids } = await service.send({
            recipients: [ann, bob, guest],
            notification: new InvoicePaid(['push']),
        });

        assert.equal(ids.length, 3);
        assert.ok(ids.every((id) => UUID_V7.test(id)));
        assert.equal(new Set(ids).size, 3);
        assert.deepEqual(
            push.render.mock.calls.map(({ arguments: [{ recipient, id }] }) => [
                recipient,
                id,
            ]),
            [
                [ann, ids[0]],
                [bob, ids[1]],
                [guest, ids[2]],
            ],
        );
    });

    it('records the owner, type and payload on the row', async () => {
        await service.send({
            recipients: [ann, guest],
            notification: new InvoicePaid(['push']),
        });

        const [annRow, guestRow] = inserted();

        assert.ok(annRow instanceof NotificationEntity);
        assert.partialDeepStrictEqual(annRow, {
            modelType: 'user',
            modelId: 5,
            type: 'invoice.paid',
            payload: { invoiceId: 7 },
        });
        assert.partialDeepStrictEqual(guestRow, {
            modelType: null,
            modelId: null,
        });
    });

    it("renders each channel's message with the notification and the recipient's locale, or the default", async () => {
        const notification = new InvoicePaid(['push', 'mail']);

        await service.send({ recipients: [ann, bob], notification });

        for (const channel of [push, mail])
            assert.deepEqual(
                channel.render.mock.calls.map(({ arguments: [input] }) => [
                    input.notification,
                    input.locale,
                ]),
                [
                    [notification, 'nl'],
                    [notification, 'en'],
                ],
            );
    });

    it('stores each rendered message as a PENDING delivery', async () => {
        await service.send({
            recipients: [ann],
            notification: new InvoicePaid(['push', 'mail']),
        });

        assert.deepEqual(inserted()[0]?.deliveries, {
            push: {
                message: { to: 'ann@example.com' },
                status: DeliveryStatus.Pending,
                attempts: 0,
            },
            mail: {
                message: { to: 'ann@example.com' },
                status: DeliveryStatus.Pending,
                attempts: 0,
            },
        });
    });

    it('skips a delivery the channel renders nothing for', async () => {
        push.render.mock.mockImplementation(async () => null);

        await service.send({
            recipients: [guest],
            notification: new InvoicePaid(['push']),
        });

        assert.deepEqual(inserted()[0]?.deliveries, {
            push: {
                message: null,
                status: DeliveryStatus.Skipped,
                attempts: 0,
            },
        });
    });

    it('stores no delivery for a channel config switches off', async () => {
        enabled.delete('mail');

        await service.send({
            recipients: [ann],
            notification: new InvoicePaid(['push', 'mail']),
        });

        assert.deepEqual(Object.keys(inserted()[0]?.deliveries ?? {}), [
            'push',
        ]);
        assert.equal(mail.render.mock.callCount(), 0);
    });

    it('stores nothing when a message cannot be rendered', async () => {
        const failure = new Error('template missing');
        mail.render.mock.mockImplementation(async ({ recipient }) => {
            if (recipient === bob) throw failure;

            return {};
        });

        await assert.rejects(
            service.send({
                recipients: [ann, bob],
                notification: new InvoicePaid(['push', 'mail']),
            }),
            failure,
        );
        assert.equal(transactionManager.insert.mock.callCount(), 0);
        assert.equal(deliveryWorker.startSweep.mock.callCount(), 0);
    });

    it('puts it in the inbox only when it lists the database channel and the recipient has an owner', async () => {
        await service.send({
            recipients: [ann, guest],
            notification: new InvoicePaid(['database', 'push']),
        });
        assert.deepEqual(
            inserted().map(({ inbox }) => inbox),
            [true, false],
        );

        await service.send({
            recipients: [ann],
            notification: new InvoicePaid(['push']),
        });
        assert.deepEqual(
            inserted().map(({ inbox }) => inbox),
            [false],
        );
    });

    it('rejects when the rows cannot be stored, and delivers nothing', async () => {
        const failure = new Error('connection terminated');
        transactionManager.insert.mock.mockImplementation(async () => {
            throw failure;
        });

        await assert.rejects(
            service.send({
                recipients: [ann],
                notification: new InvoicePaid(['push']),
            }),
            failure,
        );
        assert.equal(deliveryWorker.startSweep.mock.callCount(), 0);
    });

    it('starts a sweep once stored, which delivers it', async () => {
        const order: string[] = [];
        transactionManager.insert.mock.mockImplementation(async () => {
            order.push('insert');
            return {};
        });
        deliveryWorker.startSweep.mock.mockImplementation(() => {
            order.push('sweep');
        });

        await service.send({
            recipients: [ann, bob],
            notification: new InvoicePaid(['push']),
        });

        assert.deepEqual(order, ['insert', 'sweep']);
    });
});

describe('NotificationService.list', () => {
    it("finds the owner's inbox, newest first, 50 at a time", async () => {
        await service.list(owner);

        assert.deepEqual(lastCall(notificationRepository.find), [
            {
                where: { modelType: 'user', modelId: 5, inbox: true },
                order: { id: 'DESC' },
                take: 50,
            },
        ]);
    });

    it('continues past the last id of the previous page', async () => {
        await service.list({ ...owner, after: id, limit: 10 });

        assert.deepEqual(lastCall(notificationRepository.find), [
            {
                where: {
                    modelType: 'user',
                    modelId: 5,
                    inbox: true,
                    id: LessThan(id),
                },
                order: { id: 'DESC' },
                take: 10,
            },
        ]);
    });

    it('returns only the public fields', async () => {
        notificationRepository.find.mock.mockImplementation(async () => [
            anEntity(),
        ]);

        const [notification] = await service.list(owner);

        assert.deepEqual(notification, {
            id,
            type: 'invoice.paid',
            payload: { invoiceId: 7 },
            readAt: null,
            createdAt: new Date('2026-01-01'),
        });
    });
});

describe('NotificationService.unreadCount', () => {
    it("counts the unread ones in the owner's inbox", async () => {
        notificationRepository.countBy.mock.mockImplementation(async () => 3);

        assert.equal(await service.unreadCount(owner), 3);
        assert.deepEqual(lastCall(notificationRepository.countBy), [
            { modelType: 'user', modelId: 5, inbox: true, readAt: IsNull() },
        ]);
    });
});

describe('NotificationService.markRead', () => {
    it("marks those of the ids that are unread in the owner's inbox, and says how many", async () => {
        const before = Date.now();
        const ids = [id, '01926d3a-9999-7cc2-a0a9-3b6f1c2d4e5f'];

        assert.equal(await service.markRead({ ...owner, ids }), 2);

        const [criteria, values] = lastCall(notificationRepository.update) as [
            unknown,
            { readAt: Date },
        ];

        assert.deepEqual(criteria, {
            modelType: 'user',
            modelId: 5,
            inbox: true,
            id: In(ids),
            readAt: IsNull(),
        });
        assert.ok(values.readAt.getTime() >= before);
    });

    it('does not query for no ids', async () => {
        assert.equal(await service.markRead({ ...owner, ids: [] }), 0);
        assert.equal(notificationRepository.update.mock.callCount(), 0);
    });
});

describe('NotificationService.markAllRead', () => {
    it("marks the owner's whole inbox, and says how many were unread", async () => {
        assert.equal(await service.markAllRead(owner), 2);
        assert.deepEqual(lastCall(notificationRepository.update)?.[0], {
            modelType: 'user',
            modelId: 5,
            inbox: true,
            readAt: IsNull(),
        });
    });

    it('says none when the driver reports nothing', async () => {
        notificationRepository.update.mock.mockImplementation(async () => ({}));

        assert.equal(await service.markAllRead(owner), 0);
    });
});

describe('NotificationService.deleteForModel', () => {
    it('deletes every notification of the model, not only its inbox, and its devices, and says how many of each', async () => {
        assert.deepEqual(await service.deleteForModel(owner), {
            notifications: 3,
            devices: 1,
        });
        assert.deepEqual(lastCall(notificationRepository.delete), [owner]);
        assert.deepEqual(lastCall(devicesService.unregisterFor), [owner]);
    });
});
