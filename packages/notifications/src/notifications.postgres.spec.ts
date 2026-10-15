import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import { DataSource, type Repository } from 'typeorm';
import { DeliveryWorker } from './delivery/delivery.worker.js';
import { DevicesService } from './devices/devices.service.js';
import type { NotificationsExplorer } from './discovery/notifications.explorer.js';
import { DeviceEntity } from './entities/device.entity.js';
import { NotificationEntity } from './entities/notification.entity.js';
import { Notification } from './notification.js';
import { notificationsConfig } from './notifications.config.js';
import { NotificationService } from './notifications.service.js';
import {
    type ChannelSendInput,
    type DeliveryResult,
    type DeliveryState,
    DeliveryStatus,
    type NameInput,
} from './types/types.js';

// the SQL the other specs fake, run for real: TEST_DATABASE_URL=postgres://user:password@localhost:5432/db
const url = process.env.TEST_DATABASE_URL;

class InvoicePaid extends Notification<{ invoiceId: number }> {
    readonly type = 'invoice.paid';
    readonly channels = ['database', 'fake'];

    constructor() {
        super({ invoiceId: 7 });
    }
}

const ann = { modelType: 'user', modelId: 1 };
const bob = { modelType: 'user', modelId: 2 };
const MINUTE = 60_000;

const sent = (): DeliveryResult => ({ status: DeliveryStatus.Sent });

const fake = {
    render: async () => ({ text: 'Invoice paid' }),
    send: mock.fn(async ({ deliveries }: ChannelSendInput) =>
        deliveries.map(sent),
    ),
};

/** The notification ids the fake channel was asked to send, in order. */
const sentIds = () =>
    fake.send.mock.calls.flatMap(({ arguments: [{ deliveries }] }) =>
        deliveries.map(({ notificationId }) => notificationId),
    );

const explorer = {
    knows: ({ name }: NameInput) => name === 'database' || name === 'fake',
    channel: ({ name }: NameInput) => (name === 'fake' ? fake : undefined),
    pushProvider: ({ name }: NameInput) =>
        name === 'expo'
            ? {
                  send: async () => ({ invalidTokens: [] }),
                  isValidToken: () => true,
              }
            : undefined,
} as unknown as NotificationsExplorer;

const config = notificationsConfig({ NOTIFICATIONS_PUSH_PROVIDERS: 'expo' });

describe('against Postgres', {
    skip: !url && 'TEST_DATABASE_URL is unset',
}, () => {
    // a schema of its own, so the run touches nothing else in the database
    const schema = `notifications_test_${randomUUID().replaceAll('-', '')}`;
    let dataSource: DataSource;
    let notifications: Repository<NotificationEntity>;
    let worker: DeliveryWorker;
    let service: NotificationService;
    let devices: DevicesService;

    let stored = 0;

    /** Stores a notification for Ann whose fake delivery is in this state, each with a later id than the last. */
    const aStored = async (state: Partial<DeliveryState>) => {
        const id = `01926d3a-7c1e-7cc2-a0a9-${String(++stored).padStart(12, '0')}`;

        await notifications.insert({
            id,
            ...ann,
            type: 'invoice.paid',
            payload: {},
            inbox: true,
            deliveries: {
                fake: {
                    message: { text: 'Invoice paid' },
                    status: DeliveryStatus.Pending,
                    attempts: 0,
                    ...state,
                },
            },
        });

        return id;
    };

    const stateOf = async (id: string) =>
        (await notifications.findOneByOrFail({ id })).deliveries.fake;

    const aWorker = () => new DeliveryWorker(notifications, explorer);

    before(async () => {
        const admin = new DataSource({ type: 'postgres', url });
        await admin.initialize();
        await admin.query(`CREATE SCHEMA "${schema}"`);
        await admin.destroy();

        dataSource = new DataSource({
            type: 'postgres',
            url,
            schema,
            entities: [NotificationEntity, DeviceEntity],
            synchronize: true,
        });
        await dataSource.initialize();
        notifications = dataSource.getRepository(NotificationEntity);
    });

    after(async () => {
        await dataSource?.query(`DROP SCHEMA "${schema}" CASCADE`);
        await dataSource?.destroy();
    });

    beforeEach(async () => {
        await dataSource.query(
            `TRUNCATE "${schema}"."notification", "${schema}"."device"`,
        );
        mock.restoreAll();
        fake.send.mock.resetCalls();
        worker = aWorker();
        devices = new DevicesService(
            dataSource.getRepository(DeviceEntity),
            explorer,
            config,
        );
        service = new NotificationService(
            notifications,
            explorer,
            worker,
            devices,
            config,
        );
    });

    describe('delivery', () => {
        it('stores a send, delivers it and records it SENT', async () => {
            const [id] = (
                await service.send({
                    recipients: [ann],
                    notification: new InvoicePaid(),
                })
            ).ids;
            await worker.onModuleDestroy();

            assert.partialDeepStrictEqual(await stateOf(String(id)), {
                message: { text: 'Invoice paid' },
                status: DeliveryStatus.Sent,
                attempts: 1,
            });
        });

        it('stores a large send whole or not at all, across its batches', async () => {
            const recipients = Array.from({ length: 1_001 }, (_, i) => ({
                modelType: 'user',
                modelId: i + 1,
            }));
            let rendered = 0;
            mock.method(fake, 'render', async () => {
                if (++rendered > 1_000) throw new Error('template missing');
                return { text: 'Invoice paid' };
            });

            await assert.rejects(
                service.send({ recipients, notification: new InvoicePaid() }),
                /template missing/,
            );

            assert.equal(await notifications.count(), 0);
        });

        it('puts a failed delivery back as PENDING, which the sweep leaves until its retry is due', async () => {
            fake.send.mock.mockImplementation(async ({ deliveries }) =>
                deliveries.map(() => ({
                    status: DeliveryStatus.Failed,
                    error: new Error('ECONNRESET'),
                })),
            );
            const [id] = (
                await service.send({
                    recipients: [ann],
                    notification: new InvoicePaid(),
                })
            ).ids;
            await worker.onModuleDestroy();

            const failed = await stateOf(String(id));
            assert.equal(failed?.status, DeliveryStatus.Pending);
            assert.equal(
                Math.round(
                    (Date.parse(String(failed?.retryAt)) - Date.now()) / MINUTE,
                ),
                1,
            );

            fake.send.mock.restore();
            fake.send.mock.resetCalls();
            await aWorker().sweep();
            assert.equal(fake.send.mock.callCount(), 0);

            await notifications.update(
                { id: String(id) },
                {
                    deliveries: {
                        fake: {
                            ...failed,
                            retryAt: new Date(Date.now() - 1).toISOString(),
                        } as DeliveryState,
                    },
                },
            );
            await aWorker().sweep();

            assert.partialDeepStrictEqual(await stateOf(String(id)), {
                status: DeliveryStatus.Sent,
                attempts: 2,
            });
        });

        it('sweeps what is due or was left by a stopped process, oldest first, and nothing else', async () => {
            const due = await aStored({});
            await aStored({
                attempts: 1,
                retryAt: new Date(Date.now() + MINUTE).toISOString(),
            });
            const stale = await aStored({
                status: DeliveryStatus.Processing,
                attempts: 1,
                startedAt: new Date(Date.now() - 10 * MINUTE).toISOString(),
            });
            await aStored({
                status: DeliveryStatus.Processing,
                attempts: 1,
                startedAt: new Date().toISOString(),
            });
            await aStored({ status: DeliveryStatus.Sent, attempts: 1 });
            const retried = await aStored({
                attempts: 2,
                retryAt: new Date(Date.now() - 1).toISOString(),
            });

            await aWorker().sweep();

            assert.deepEqual(sentIds(), [due, stale, retried]);
        });

        it('sends a delivery once when two processes sweep it at the same time', async () => {
            const id = await aStored({});
            // each sweep finds it before either claims it, as two processes can
            const loaded = [
                await notifications.findBy({ id }),
                await notifications.findBy({ id }),
            ];
            mock.method(notifications, 'find', async () => loaded.shift());

            await Promise.all([aWorker().sweep(), aWorker().sweep()]);

            assert.deepEqual(sentIds(), [id]);
            assert.equal((await stateOf(id))?.status, DeliveryStatus.Sent);
        });
    });

    describe('inbox', () => {
        it('pages newest first, counts and marks the unread', async () => {
            const { ids } = await service.send({
                recipients: [ann, ann, ann, bob],
                notification: new InvoicePaid(),
            });
            await worker.onModuleDestroy();
            // Node's UUIDv7 is not monotonic within a millisecond, so newest first is by id, not by recipient
            const [newest, middle, oldest] = ids.slice(0, 3).sort().reverse();

            const page = await service.list({ ...ann, limit: 2 });
            assert.deepEqual(
                page.map(({ id }) => id),
                [newest, middle],
            );
            assert.deepEqual(
                (await service.list({ ...ann, after: middle })).map(
                    ({ id }) => id,
                ),
                [oldest],
            );

            assert.equal(await service.unreadCount(ann), 3);
            assert.equal(
                await service.markRead({
                    ...ann,
                    ids: [String(oldest), String(ids[3])],
                }),
                1,
            );
            assert.equal(await service.unreadCount(ann), 2);
            assert.equal(await service.markAllRead(ann), 2);
            assert.equal(await service.unreadCount(ann), 0);
            assert.equal(await service.unreadCount(bob), 1);
        });
    });

    describe('devices', () => {
        it('moves a token to whoever registered it last, and finds and removes devices by owner and token', async () => {
            await devices.register({
                ...ann,
                token: 'ExponentPushToken[phone]',
            });
            await devices.register({
                ...bob,
                token: 'ExponentPushToken[phone]',
            });
            await devices.register({
                ...ann,
                token: 'ExponentPushToken[tablet]',
            });

            const found = await devices.findFor({ owners: [ann, bob] });
            assert.deepEqual(
                found.map(({ modelId, token }) => [modelId, token]).sort(),
                [
                    [1, 'ExponentPushToken[tablet]'],
                    [2, 'ExponentPushToken[phone]'],
                ],
            );

            assert.equal(
                await devices.unregister({
                    tokens: ['ExponentPushToken[phone]'],
                }),
                1,
            );
            assert.equal((await devices.findFor({ owners: [bob] })).length, 0);
        });
    });

    describe('deleting a model', () => {
        it('deletes its notifications, in its inbox or not, and its devices, even with a delivery to it underway', async () => {
            await devices.register({
                ...ann,
                token: 'ExponentPushToken[phone]',
            });
            await devices.register({
                ...bob,
                token: 'ExponentPushToken[tablet]',
            });
            const [outsideInbox, bobs] = (
                await service.send({
                    recipients: [ann, bob],
                    notification: new InvoicePaid(),
                })
            ).ids;
            await worker.onModuleDestroy();
            await notifications.update(
                { id: String(outsideInbox) },
                { inbox: false },
            );
            await aStored({});
            let deleted: unknown;
            // ann goes while her batch is out, so recording how it went finds nothing to move
            fake.send.mock.mockImplementationOnce(async ({ deliveries }) => {
                deleted = await service.deleteForModel(ann);
                return deliveries.map(sent);
            });

            await aWorker().sweep();

            assert.deepEqual(deleted, { notifications: 2, devices: 1 });
            assert.deepEqual(
                (await notifications.find()).map(({ id }) => id),
                [bobs],
            );
            assert.deepEqual(
                (await devices.findFor({ owners: [ann, bob] })).map(
                    ({ token }) => token,
                ),
                ['ExponentPushToken[tablet]'],
            );
        });
    });
});
