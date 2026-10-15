import { Inject, Injectable } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { PushProvider } from '../../decorators/notifications.decorators.js';
import { UndeliverableError } from '../../delivery/undeliverable.error.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../../notifications.config.js';
import type {
    PushFailure,
    PushSendInput,
    PushSendOutput,
} from '../../types/types.js';
import type { IPushProvider } from './push-provider.interface.js';

@Injectable()
@PushProvider('expo')
export class ExpoPushProvider implements IPushProvider {
    readonly batchSize = 100;

    // the SDK queues requests past its own maxConcurrentRequests, so its default applies
    readonly concurrency = Number.POSITIVE_INFINITY;

    private readonly expo: Expo;

    constructor(
        @Inject(notificationsConfig.KEY)
        private readonly config: NotificationsConfig,
    ) {
        this.expo = new Expo({ accessToken: this.config.expo.accessToken });
    }

    /** Sends the pushes in one request, reporting the tokens Expo no longer knows and the pushes it refused. */
    async send({ pushes }: PushSendInput): Promise<PushSendOutput> {
        const invalidTokens: string[] = [];
        const failures: PushFailure[] = [];
        const sendable: { index: number; message: ExpoPushMessage }[] = [];

        for (const [index, { token, message }] of pushes.entries())
            if (Expo.isExpoPushToken(token))
                sendable.push({ index, message: { to: token, ...message } });
            else invalidTokens.push(token);

        if (!sendable.length) return { invalidTokens, failures };

        // a failed request throws, so the worker tries all of it again
        const tickets = await this.expo.sendPushNotificationsAsync(
            sendable.map(({ message }) => message),
        );

        // one message per token, so each ticket sits at its message's position
        for (const [position, ticket] of tickets.entries()) {
            const pushed = sendable[position];

            if (ticket.status === 'ok' || !pushed) continue;

            const refused = `Expo refused the push: ${ticket.message}`;

            switch (ticket.details?.error) {
                case 'DeviceNotRegistered':
                    invalidTokens.push(String(pushed.message.to));
                    break;

                // the access token is wrong, so every later push would be refused too
                case 'InvalidCredentials':
                    throw new UndeliverableError(refused);

                // the same message would be refused again
                case 'MessageTooBig':
                case 'DeveloperError':
                    failures.push({
                        index: pushed.index,
                        error: new UndeliverableError(refused),
                    });
                    break;

                // rate limited, or Expo or Apple/Google failing for now
                default:
                    failures.push({
                        index: pushed.index,
                        error: new Error(refused),
                    });
            }
        }

        return { invalidTokens, failures };
    }
}
