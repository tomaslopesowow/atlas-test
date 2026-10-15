import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
    Expo,
    type ExpoPushErrorTicket,
    type ExpoPushMessage,
    type ExpoPushReceipt,
    type ExpoPushTicket,
} from 'expo-server-sdk';
import { UndeliverableError } from '../../delivery/undeliverable.error.js';
import { DevicesService } from '../../devices/devices.service.js';
import { notificationsConfig } from '../../notifications.config.js';
import type { PushMessage } from '../../types/types.js';
import { ExpoPushProvider } from './expo-push.provider.js';

const message: PushMessage = {
    title: 'Invoice paid',
    body: '40 received',
    data: { notificationId: 'n1' },
    sound: 'default',
    badge: 3,
    priority: 'high',
};

const tokenOf = (name: string) => `ExponentPushToken[${name}]`;
const pushesTo = (...tokens: string[]) => ({
    pushes: tokens.map((token) => ({ token, message })),
});

const anError = (
    error: NonNullable<ExpoPushErrorTicket['details']>['error'],
): ExpoPushErrorTicket => ({
    status: 'error',
    message: `${error} happened`,
    details: { error },
});

// every request reaches Expo through sendPushNotificationsAsync, so faking it fakes Expo
const fakeSend = () =>
    mock.method(
        Expo.prototype,
        'sendPushNotificationsAsync',
        async (messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> =>
            messages.map((_, i) => ({ status: 'ok', id: `receipt-${i}` })),
    );

let send: ReturnType<typeof fakeSend>;

const devicesService = {
    unregister: mock.fn(async (_input: { tokens: string[] }) => 0),
};

/** The `to` of each request sent to Expo, in order. */
const requests = () =>
    send.mock.calls.map(({ arguments: [messages] }) =>
        messages.map(({ to }) => to),
    );

const aProvider = async (env: Record<string, string> = {}) => {
    const module = await Test.createTestingModule({
        providers: [
            ExpoPushProvider,
            {
                provide: notificationsConfig.KEY,
                useValue: notificationsConfig({
                    NOTIFICATIONS_PUSH_PROVIDERS: 'expo',
                    ...env,
                }),
            },
            { provide: DevicesService, useValue: devicesService },
        ],
    }).compile();

    return module.get(ExpoPushProvider);
};

let provider: ExpoPushProvider;

beforeEach(async () => {
    send = fakeSend();
    devicesService.unregister.mock.resetCalls();
    provider = await aProvider();
});

afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
});

describe('ExpoPushProvider', () => {
    it('takes only Expo push tokens for its devices', () => {
        assert.equal(provider.isValidToken({ token: tokenOf('a') }), true);
        assert.equal(provider.isValidToken({ token: 'fcm:abc' }), false);
    });
});

describe('ExpoPushProvider.send', () => {
    it('sends each push with its title, body, data, sound, badge and priority', async () => {
        const result = await provider.send(
            pushesTo(tokenOf('a'), tokenOf('b'), tokenOf('c')),
        );

        assert.deepEqual(send.mock.calls[0]?.arguments, [
            [
                { to: tokenOf('a'), ...message },
                { to: tokenOf('b'), ...message },
                { to: tokenOf('c'), ...message },
            ],
        ]);
        assert.deepEqual(result, { invalidTokens: [], failures: [] });
    });

    it('sends the pushes in requests of at most 100, as Expo takes', async () => {
        await provider.send(
            pushesTo(...Array.from({ length: 150 }, (_, i) => tokenOf(`${i}`))),
        );

        assert.deepEqual(
            requests().map((tokens) => tokens.length),
            [100, 50],
        );
    });

    it('reports a token that is not an Expo token, without sending to it', async () => {
        const result = await provider.send(
            pushesTo('fcm:abc', tokenOf('a'), 'not-a-token'),
        );

        assert.deepEqual(requests(), [[tokenOf('a')]]);
        assert.deepEqual(result, {
            invalidTokens: ['fcm:abc', 'not-a-token'],
            failures: [],
        });
    });

    it('sends no request when no token is an Expo token', async () => {
        const result = await provider.send(pushesTo('fcm:abc'));

        assert.equal(send.mock.callCount(), 0);
        assert.deepEqual(result, { invalidTokens: ['fcm:abc'], failures: [] });
    });

    it('reports the token of a DeviceNotRegistered ticket, found by its position across the requests', async () => {
        send.mock.mockImplementation(async (messages) =>
            messages.map(({ to }, i) =>
                to === tokenOf('gone')
                    ? anError('DeviceNotRegistered')
                    : { status: 'ok', id: `r${i}` },
            ),
        );
        const tokens = Array.from({ length: 150 }, (_, i) =>
            tokenOf(i === 120 ? 'gone' : `${i}`),
        );

        const result = await provider.send(pushesTo('fcm:abc', ...tokens));

        assert.deepEqual(result, {
            invalidTokens: ['fcm:abc', tokenOf('gone')],
            failures: [],
        });
    });

    it('fails as undeliverable on InvalidCredentials, as every later push would', async () => {
        send.mock.mockImplementation(async (messages) =>
            messages.map(() => anError('InvalidCredentials')),
        );

        await assert.rejects(
            provider.send(pushesTo(tokenOf('a'))),
            (error) =>
                error instanceof UndeliverableError &&
                /InvalidCredentials happened/.test(error.message),
        );
    });

    it('reports a push refused for now by its position among the pushes, so its delivery is tried again', async () => {
        for (const error of [
            'MessageRateExceeded',
            'ExpoError',
            'ProviderError',
        ] as const) {
            send.mock.mockImplementation(async (messages) =>
                messages.map(({ to }, i) =>
                    to === tokenOf('busy')
                        ? anError(error)
                        : { status: 'ok', id: `r${i}` },
                ),
            );

            // the invalid token goes unsent, which must not shift the position reported
            const { failures } = await provider.send(
                pushesTo('fcm:abc', tokenOf('a'), tokenOf('busy')),
            );

            assert.equal(failures?.length, 1, error);
            assert.equal(failures?.[0]?.index, 2, error);
            assert.ok(
                !(failures?.[0]?.error instanceof UndeliverableError),
                error,
            );
            assert.match(String(failures?.[0]?.error), new RegExp(error));
        }
    });

    it('reports a push Expo would refuse again as undeliverable', async () => {
        for (const error of ['MessageTooBig', 'DeveloperError'] as const) {
            send.mock.mockImplementation(async (messages) =>
                messages.map(() => anError(error)),
            );

            const { failures } = await provider.send(pushesTo(tokenOf('a')));

            assert.equal(failures?.[0]?.index, 0, error);
            assert.ok(
                failures?.[0]?.error instanceof UndeliverableError,
                error,
            );
        }
    });

    it('fails the pushes of a request that failed for now, keeping the results of the others', async () => {
        const outage = new Error('fetch failed');
        send.mock.mockImplementation(async (messages) => {
            if (messages.length === 100) throw outage;

            return messages.map(({ to }) =>
                to === tokenOf('gone')
                    ? anError('DeviceNotRegistered')
                    : { status: 'ok', id: `r-${to}` },
            );
        });

        const { invalidTokens, failures } = await provider.send(
            pushesTo(
                ...Array.from({ length: 100 }, (_, i) => tokenOf(`${i}`)),
                tokenOf('gone'),
            ),
        );

        assert.deepEqual(invalidTokens, [tokenOf('gone')]);
        assert.deepEqual(
            failures,
            Array.from({ length: 100 }, (_, index) => ({
                index,
                error: outage,
            })),
        );
    });
});

describe('ExpoPushProvider receipts', () => {
    const MINUTE = 60_000;

    let logged: string[];
    let receiptsOf: Record<string, ExpoPushReceipt>;
    let getReceipts: ReturnType<typeof fakeGetReceipts>;

    // only what Expo has a receipt for comes back
    const fakeGetReceipts = () =>
        mock.method(
            Expo.prototype,
            'getPushNotificationReceiptsAsync',
            async (ids: string[]) =>
                Object.fromEntries(
                    ids.flatMap((id) =>
                        receiptsOf[id] ? [[id, receiptsOf[id]]] : [],
                    ),
                ),
        );

    const gone = (): ExpoPushReceipt => ({
        status: 'error',
        message: 'The device cannot receive push notifications anymore',
        details: { error: 'DeviceNotRegistered' },
    });

    const unregistered = () =>
        devicesService.unregister.mock.calls.map(
            ({ arguments: [{ tokens }] }) => tokens,
        );

    beforeEach(() => {
        logged = [];
        receiptsOf = {};
        getReceipts = fakeGetReceipts();
        mock.timers.enable({ apis: ['Date', 'setInterval'] });
        mock.method(Logger.prototype, 'error', (text: unknown) => {
            logged.push(String(text));
        });
        // a ticket per push, named after its token
        send.mock.mockImplementation(async (messages) =>
            messages.map(({ to }) => ({ status: 'ok', id: `ticket-${to}` })),
        );
    });

    it('asks for no receipt before Expo has it, 15 minutes after the push', async () => {
        await provider.send(pushesTo(tokenOf('a')));

        mock.timers.tick(14 * MINUTE);
        await provider.checkReceipts();

        assert.equal(getReceipts.mock.callCount(), 0);
    });

    it('removes the devices whose receipts say they are gone, which their tickets did not', async () => {
        await provider.send(pushesTo(tokenOf('a'), tokenOf('b')));
        receiptsOf[`ticket-${tokenOf('a')}`] = gone();
        receiptsOf[`ticket-${tokenOf('b')}`] = { status: 'ok' };

        mock.timers.tick(15 * MINUTE);
        await provider.checkReceipts();

        assert.deepEqual(getReceipts.mock.calls[0]?.arguments, [
            [`ticket-${tokenOf('a')}`, `ticket-${tokenOf('b')}`],
        ]);
        assert.deepEqual(unregistered(), [[tokenOf('a')]]);
    });

    it('logs any other error a receipt reports, removing no device', async () => {
        await provider.send(pushesTo(tokenOf('a')));
        receiptsOf[`ticket-${tokenOf('a')}`] = {
            status: 'error',
            message: 'Too many messages to this device',
            details: { error: 'MessageRateExceeded' },
        };

        mock.timers.tick(15 * MINUTE);
        await provider.checkReceipts();

        assert.deepEqual(logged, [
            'Expo could not deliver a push: Too many messages to this device',
        ]);
        assert.equal(devicesService.unregister.mock.callCount(), 0);
    });

    it('asks for each receipt once', async () => {
        await provider.send(pushesTo(tokenOf('a')));
        receiptsOf[`ticket-${tokenOf('a')}`] = { status: 'ok' };

        mock.timers.tick(15 * MINUTE);
        await provider.checkReceipts();
        await provider.checkReceipts();

        assert.equal(getReceipts.mock.callCount(), 1);
    });

    it('asks again for a receipt Expo does not have yet, until the day Expo keeps receipts for has passed', async () => {
        await provider.send(pushesTo(tokenOf('a')));

        mock.timers.tick(15 * MINUTE);
        await provider.checkReceipts();
        mock.timers.tick(24 * 60 * MINUTE);
        await provider.checkReceipts();
        await provider.checkReceipts();

        assert.equal(getReceipts.mock.callCount(), 2);
    });

    it('keeps the tickets of a check that fails, for the next one', async () => {
        await provider.send(pushesTo(tokenOf('a')));
        receiptsOf[`ticket-${tokenOf('a')}`] = gone();
        getReceipts.mock.mockImplementationOnce(async () => {
            throw new Error('socket hang up');
        });

        mock.timers.tick(15 * MINUTE);
        await assert.rejects(provider.checkReceipts(), /socket hang up/);
        await provider.checkReceipts();

        assert.deepEqual(unregistered(), [[tokenOf('a')]]);
    });

    it('removes the devices an earlier request of a check found gone, though a later one fails', async () => {
        await provider.send(pushesTo(tokenOf('a'), tokenOf('b')));
        receiptsOf[`ticket-${tokenOf('a')}`] = gone();
        mock.method(
            Expo.prototype,
            'chunkPushNotificationReceiptIds',
            (ids: string[]) => ids.map((id) => [id]),
        );
        getReceipts.mock.mockImplementationOnce(async () => {
            throw new Error('socket hang up');
        }, 1);

        mock.timers.tick(15 * MINUTE);
        await assert.rejects(provider.checkReceipts(), /socket hang up/);

        assert.deepEqual(unregistered(), [[tokenOf('a')]]);
    });

    it('checks every 5 minutes once the app is up, logging a check that fails, and stops on shutdown', async () => {
        const check = mock.method(provider, 'checkReceipts', async () => {
            throw new Error('socket hang up');
        });

        provider.onApplicationBootstrap();
        mock.timers.tick(5 * MINUTE);
        await setImmediate();

        assert.equal(check.mock.callCount(), 1);
        assert.deepEqual(logged, ['Could not check the Expo receipts']);

        await provider.onModuleDestroy();
        mock.timers.tick(5 * MINUTE);

        assert.equal(check.mock.callCount(), 1);
    });
});
