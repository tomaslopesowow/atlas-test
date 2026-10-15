import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UndeliverableError } from '../delivery/undeliverable.error.js';
import { DevicesService } from '../devices/devices.service.js';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import { DeviceEntity } from '../entities/device.entity.js';
import { Notification, type ToPush } from '../notification.js';
import type { IPushProvider } from '../providers/push/push-provider.interface.js';
import {
    type Delivery,
    DeliveryStatus,
    type ModelRef,
    type NameInput,
    type OwnersInput,
    type PushMessage,
    type PushSendInput,
    type PushSendOutput,
    type RenderInput,
    type TokensInput,
} from '../types/types.js';
import { PushChannel } from './push.channel.js';

type Paid = { amount: number };

class InvoicePaid extends Notification<Paid> implements ToPush<Paid> {
    readonly type = 'invoice.paid';
    readonly channels = ['push'];

    async toPush({ payload }: RenderInput<Paid>): Promise<PushMessage> {
        return {
            title: 'Invoice paid',
            body: `${payload.amount} received`,
            data: { amount: payload.amount },
        };
    }
}

class InvoiceVoided extends Notification<Paid> {
    readonly type = 'invoice.voided';
    readonly channels = ['push'];
}

const id = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';
const user = (modelId: number): ModelRef => ({
    modelType: 'user',
    modelId,
});

const aDevice = (
    owner: ModelRef,
    token: string,
    provider = 'expo',
): DeviceEntity =>
    Object.assign(new DeviceEntity(), { ...owner, token, provider });

const aMessage = (body: string): PushMessage => ({
    title: 'Invoice paid',
    body,
});

const aDelivery = (
    owner: ModelRef | undefined,
    body = `for ${owner?.modelId}`,
): Delivery<PushMessage> => ({
    notificationId: body,
    owner,
    message: aMessage(body),
});

/** What a provider accepts, sending nothing. */
const aProvider = () => ({
    send: mock.fn(
        async (_input: PushSendInput): Promise<PushSendOutput> => ({
            invalidTokens: [],
        }),
    ),
});

const providers = { expo: aProvider(), apns: aProvider() };

let devices: DeviceEntity[];

const devicesService = {
    findFor: mock.fn(
        async ({ owners }: OwnersInput): Promise<DeviceEntity[]> =>
            devices.filter((device) =>
                owners.some(
                    ({ modelType, modelId }) =>
                        device.modelType === modelType &&
                        device.modelId === modelId,
                ),
            ),
    ),
    unregister: mock.fn(
        async ({ tokens }: TokensInput): Promise<number> => tokens.length,
    ),
};

// fcm has devices but is switched off
const explorer = {
    pushProvider: mock.fn(
        ({ name }: NameInput): IPushProvider | undefined =>
            (providers as Record<string, IPushProvider>)[name],
    ),
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

/** The tokens of each request a provider got, in order. */
const requests = (provider: ReturnType<typeof aProvider>) =>
    provider.send.mock.calls.map(({ arguments: [{ pushes }] }) =>
        pushes.map(({ token }) => token),
    );

const statuses = (results: { status: DeliveryStatus }[]) =>
    results.map(({ status }) => status);

const { Sent, Skipped, Failed } = DeliveryStatus;

let channel: PushChannel;
let warn: ReturnType<typeof mock.method>;
let logError: ReturnType<typeof mock.method>;

beforeEach(async () => {
    resetMocks(devicesService, explorer, ...Object.values(providers));
    devices = [];
    warn = mock.method(Logger.prototype, 'warn', () => {});
    logError = mock.method(Logger.prototype, 'error', () => {});

    const module = await Test.createTestingModule({
        providers: [
            PushChannel,
            { provide: DevicesService, useValue: devicesService },
            { provide: NotificationsExplorer, useValue: explorer },
        ],
    }).compile();

    channel = module.get(PushChannel);
});

afterEach(() => mock.restoreAll());

describe('PushChannel.render', () => {
    const recipient = { ...user(5), locale: 'nl' };

    it("renders the notification's push, carrying its id for the app to open", async () => {
        const message = await channel.render({
            notification: new InvoicePaid({ amount: 40 }),
            id,
            recipient,
            locale: 'nl',
        });

        assert.deepEqual(message, {
            title: 'Invoice paid',
            body: '40 received',
            data: { amount: 40, notificationId: id },
        });
    });

    it('renders with the id, recipient, payload and locale, on the notification itself', async () => {
        const notification = new InvoicePaid({ amount: 40 });
        const toPush = mock.method(notification, 'toPush');

        await channel.render({ notification, id, recipient, locale: 'nl' });

        assert.deepEqual(toPush.mock.calls[0]?.arguments, [
            { id, recipient, payload: { amount: 40 }, locale: 'nl' },
        ]);
        assert.equal(toPush.mock.calls[0]?.this, notification);
    });

    it('adds the id to a push without data', async () => {
        const notification = new InvoicePaid({ amount: 40 });
        mock.method(notification, 'toPush', () => ({ title: 'Hi', body: '' }));

        const message = await channel.render({
            notification,
            id,
            recipient,
            locale: 'nl',
        });

        assert.deepEqual(message?.data, { notificationId: id });
    });

    it('renders nothing for a recipient without an owner, who has no devices', async () => {
        const notification = new InvoicePaid({ amount: 40 });
        const toPush = mock.method(notification, 'toPush');

        const message = await channel.render({
            notification,
            id,
            recipient: { email: 'ada@example.test' },
            locale: 'nl',
        });

        assert.equal(message, null);
        assert.equal(toPush.mock.callCount(), 0);
    });

    it('refuses a notification that lists push but cannot render one', async () => {
        await assert.rejects(
            channel.render({
                notification: new InvoiceVoided({ amount: 40 }),
                id,
                recipient,
                locale: 'nl',
            }),
            new TypeError(
                '"invoice.voided" lists the push channel but has no toPush()',
            ),
        );
    });
});

describe('PushChannel.send', () => {
    it('looks up the devices of every owner in one query', async () => {
        await channel.send({
            deliveries: [
                aDelivery(user(5)),
                aDelivery(user(6)),
                aDelivery(user(5), 'again'),
                aDelivery(undefined),
            ],
        });

        assert.equal(devicesService.findFor.mock.callCount(), 1);
        assert.deepEqual(lastCall(devicesService.findFor), [
            { owners: [user(5), user(6), user(5)] },
        ]);
    });

    it('pushes each delivery to every device of its owner, in one call to the provider', async () => {
        devices = [
            aDevice(user(5), 'ada-phone'),
            aDevice(user(5), 'ada-tablet'),
            aDevice(user(6), 'bob-phone'),
        ];

        const results = await channel.send({
            deliveries: [aDelivery(user(5)), aDelivery(user(6))],
        });

        assert.deepEqual(statuses(results), [Sent, Sent]);
        assert.deepEqual(lastCall(providers.expo.send), [
            {
                pushes: [
                    { token: 'ada-phone', message: aMessage('for 5') },
                    { token: 'ada-tablet', message: aMessage('for 5') },
                    { token: 'bob-phone', message: aMessage('for 6') },
                ],
            },
        ]);
        assert.equal(providers.expo.send.mock.callCount(), 1);
    });

    it('skips a delivery whose owner has no devices, or that has no owner', async () => {
        devices = [aDevice(user(6), 'bob-phone')];

        const results = await channel.send({
            deliveries: [
                aDelivery(user(5)),
                aDelivery(user(6)),
                aDelivery(undefined),
            ],
        });

        assert.deepEqual(statuses(results), [Skipped, Sent, Skipped]);
        assert.deepEqual(requests(providers.expo), [['bob-phone']]);
    });

    it('drops the pushes of a provider that is switched off, skipping a delivery left with none', async () => {
        devices = [
            aDevice(user(5), 'ada-old', 'fcm'),
            aDevice(user(6), 'bob-old', 'fcm'),
            aDevice(user(6), 'bob-phone', 'expo'),
        ];

        const results = await channel.send({
            deliveries: [aDelivery(user(5)), aDelivery(user(6))],
        });

        assert.deepEqual(statuses(results), [Skipped, Sent]);
        assert.deepEqual(requests(providers.expo), [['bob-phone']]);
        assert.match(
            String(lastCall(warn)?.[0]),
            /Dropped 2 pushes for "fcm", which is not an active push provider/,
        );
        assert.equal(devicesService.unregister.mock.callCount(), 0);
    });

    it('sends each push through the provider that issued its token, the providers side by side', async () => {
        let release = () => {};
        providers.apns.send.mock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () => resolve({ invalidTokens: [] });
                }),
        );
        devices = [
            aDevice(user(5), 'ada-iphone', 'apns'),
            aDevice(user(5), 'ada-android', 'expo'),
        ];

        const sending = channel.send({ deliveries: [aDelivery(user(5))] });
        await setImmediate();

        assert.deepEqual(requests(providers.apns), [['ada-iphone']]);
        assert.deepEqual(
            requests(providers.expo),
            [['ada-android']],
            'expo waited for apns',
        );
        release();
        assert.deepEqual(statuses(await sending), [Sent]);
    });

    it('fails every delivery with a push to a provider whose send throws, with its error', async () => {
        const outage = new Error('503 Service Unavailable');

        providers.apns.send.mock.mockImplementation(async () => {
            throw outage;
        });
        devices = [
            aDevice(user(5), 'ada-phone', 'apns'),
            aDevice(user(6), 'bob-phone', 'apns'),
            aDevice(user(7), 'cy-phone', 'expo'),
        ];

        const results = await channel.send({
            deliveries: [
                aDelivery(user(5)),
                aDelivery(user(6)),
                aDelivery(user(7)),
            ],
        });

        assert.deepEqual(results, [
            { status: Failed, error: outage },
            { status: Failed, error: outage },
            { status: Sent },
        ]);
    });

    it('fails a delivery when any of its providers fails, though another sent its push', async () => {
        const outage = new Error('503 Service Unavailable');

        providers.apns.send.mock.mockImplementation(async () => {
            throw outage;
        });
        devices = [
            aDevice(user(5), 'ada-iphone', 'apns'),
            aDevice(user(5), 'ada-android', 'expo'),
        ];

        const results = await channel.send({
            deliveries: [aDelivery(user(5))],
        });

        assert.deepEqual(results, [{ status: Failed, error: outage }]);
        assert.deepEqual(requests(providers.expo), [['ada-android']]);
    });

    it('removes the tokens every provider rejects, in one call, skipping a delivery none of whose devices remain', async () => {
        providers.expo.send.mock.mockImplementation(async () => ({
            invalidTokens: ['ada-old'],
        }));
        providers.apns.send.mock.mockImplementation(async ({ pushes }) => ({
            invalidTokens: pushes
                .map(({ token }) => token)
                .filter((token) => token !== 'ada-ipad'),
        }));
        devices = [
            aDevice(user(5), 'ada-old', 'expo'),
            aDevice(user(5), 'ada-ipad', 'apns'),
            aDevice(user(6), 'bob-ipad', 'apns'),
            aDevice(user(7), 'cy-ipad', 'apns'),
        ];

        const results = await channel.send({
            deliveries: [
                aDelivery(user(5)),
                aDelivery(user(6)),
                aDelivery(user(7)),
            ],
        });

        assert.equal(devicesService.unregister.mock.callCount(), 1);
        assert.deepEqual(
            [...(lastCall(devicesService.unregister)?.[0].tokens ?? [])].sort(),
            ['ada-old', 'bob-ipad', 'cy-ipad'],
        );
        assert.deepEqual(
            statuses(results),
            [Sent, Skipped, Skipped],
            'a push to a token that is gone reached no one',
        );
    });

    it('fails only the delivery of a push the provider refused, found by its index among the pushes', async () => {
        const busy = new Error('MessageRateExceeded');
        providers.expo.send.mock.mockImplementation(async () => ({
            invalidTokens: [],
            failures: [{ index: 1, error: busy }],
        }));
        devices = [
            aDevice(user(5), 'ada-phone'),
            aDevice(user(6), 'bob-phone'),
        ];

        const results = await channel.send({
            deliveries: [aDelivery(user(5)), aDelivery(user(6))],
        });

        assert.deepEqual(statuses(results), [Sent, Failed]);
        assert.equal((results[1] as { error?: unknown }).error, busy);
    });

    it('fails a delivery as undeliverable when any of its pushes is, whatever else failed for now', async () => {
        // the passing failure arrives last, so it must not replace the permanent one
        providers.expo.send.mock.mockImplementation(async () => {
            await setImmediate();
            throw new Error('fetch failed');
        });
        providers.apns.send.mock.mockImplementation(async () => ({
            invalidTokens: [],
            failures: [{ index: 0, error: new UndeliverableError('too big') }],
        }));
        devices = [
            aDevice(user(5), 'ada-phone', 'expo'),
            aDevice(user(5), 'ada-ipad', 'apns'),
        ];

        const [result] = await channel.send({
            deliveries: [aDelivery(user(5))],
        });

        assert.equal(result?.status, Failed);
        assert.ok(
            (result as { error?: unknown }).error instanceof UndeliverableError,
        );
    });

    it('keeps the deliveries sent when removing the rejected tokens fails', async () => {
        providers.expo.send.mock.mockImplementation(async () => ({
            invalidTokens: ['ada-old'],
        }));
        devicesService.unregister.mock.mockImplementation(async () => {
            throw new Error('connection reset');
        });
        devices = [aDevice(user(5), 'ada-old'), aDevice(user(5), 'ada-phone')];

        const results = await channel.send({
            deliveries: [aDelivery(user(5))],
        });

        assert.deepEqual(statuses(results), [Sent]);
        assert.match(String(lastCall(logError)?.[0]), /connection reset/);
    });
});
