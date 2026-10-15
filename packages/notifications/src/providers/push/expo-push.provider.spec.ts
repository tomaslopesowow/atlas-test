import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { Test } from '@nestjs/testing';
import {
    Expo,
    type ExpoPushErrorTicket,
    type ExpoPushMessage,
    type ExpoPushTicket,
} from 'expo-server-sdk';
import { defaultConcurrentRequestLimit } from 'expo-server-sdk/build/ExpoClientValues.js';
import { PushProvider } from '../../decorators/notifications.decorators.js';
import { UndeliverableError } from '../../delivery/undeliverable.error.js';
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
        ],
    }).compile();

    return module.get(ExpoPushProvider);
};

let provider: ExpoPushProvider;

beforeEach(async () => {
    send = fakeSend();
    provider = await aProvider();
});

afterEach(() => mock.restoreAll());

describe('ExpoPushProvider', () => {
    it("registers as the 'expo' push provider, sending 100 per request", () => {
        assert.equal(
            Reflect.getMetadata(PushProvider.KEY, ExpoPushProvider),
            'expo',
        );
        assert.equal(provider.batchSize, 100);
    });

    it('authenticates with the configured access token, through one client', async () => {
        const authenticated = await aProvider({
            EXPO_ACCESS_TOKEN: 'expo-secret',
        });

        await authenticated.send(pushesTo(tokenOf('a')));
        await authenticated.send(pushesTo(tokenOf('b')));

        const [first, second] = send.mock.calls.map((call) => call.this);

        assert.equal(
            (first as { accessToken?: string }).accessToken,
            'expo-secret',
        );
        assert.equal(first, second);
    });

    it('sends without an access token when none is configured', async () => {
        await provider.send(pushesTo(tokenOf('a')));

        assert.equal(
            (send.mock.calls[0]?.this as { accessToken?: string }).accessToken,
            undefined,
        );
    });

    it("leaves the queueing of concurrent requests to the SDK, at the SDK's default limit", async () => {
        const flight = { now: 0, most: 0 };

        // the real sendPushNotificationsAsync, so its queue runs, down to the HTTP request
        send.mock.restore();
        mock.method(
            Expo.prototype as unknown as {
                requestAsync(
                    url: string,
                    options: { body: unknown[] },
                ): Promise<unknown>;
            },
            'requestAsync',
            async (_url: string, { body }: { body: unknown[] }) => {
                flight.most = Math.max(flight.most, ++flight.now);
                await setImmediate();
                flight.now--;

                return body.map((_, i) => ({ status: 'ok', id: `r${i}` }));
            },
        );

        await Promise.all(
            Array.from({ length: 20 }, (_, i) =>
                provider.send(pushesTo(tokenOf(`${i}`))),
            ),
        );

        assert.equal(provider.concurrency, Number.POSITIVE_INFINITY);
        assert.equal(flight.most, defaultConcurrentRequestLimit);
    });
});

describe('ExpoPushProvider.send', () => {
    it('sends each push with its title, body, data, sound, badge and priority, all in one request', async () => {
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
        assert.equal(
            send.mock.callCount(),
            1,
            'the channel keeps a call to batchSize, so it is one request',
        );
        assert.deepEqual(result, { invalidTokens: [], failures: [] });
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

    it('reports the token of a DeviceNotRegistered ticket, found by its position in its request', async () => {
        send.mock.mockImplementation(async (messages) =>
            messages.map(({ to }, i) =>
                to === tokenOf('gone')
                    ? anError('DeviceNotRegistered')
                    : { status: 'ok', id: `r${i}` },
            ),
        );
        const tokens = Array.from({ length: 90 }, (_, i) =>
            tokenOf(i === 70 ? 'gone' : `${i}`),
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

    it('rethrows a failed request, so the worker retries it', async () => {
        const outage = new Error('fetch failed');

        send.mock.mockImplementation(async () => {
            throw outage;
        });

        await assert.rejects(
            provider.send(pushesTo(tokenOf('a'))),
            (error) => error === outage,
        );
    });
});
