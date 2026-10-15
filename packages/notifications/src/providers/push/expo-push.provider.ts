import {
    Inject,
    Injectable,
    Logger,
    type OnApplicationBootstrap,
    type OnModuleDestroy,
} from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { PushProvider } from '../../decorators/notifications.decorators.js';
import { UndeliverableError } from '../../delivery/undeliverable.error.js';
import { DevicesService } from '../../devices/devices.service.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../../notifications.config.js';
import type {
    PushFailure,
    PushSendInput,
    PushSendOutput,
    TokenInput,
} from '../../types/types.js';
import type { IPushProvider } from './push-provider.interface.js';

const MINUTE = 60_000;
// Expo has a push's receipt within 15 minutes, and keeps it for a day
const RECEIPT_DELAY_MS = 15 * MINUTE;
const RECEIPT_TTL_MS = 24 * 60 * MINUTE;
const RECEIPT_CHECK_INTERVAL_MS = 5 * MINUTE;
// in memory, which a restart loses: a token that is gone is reported again by its next push's receipt
const MAX_TICKETS = 100_000;

@Injectable()
@PushProvider('expo')
export class ExpoPushProvider
    implements IPushProvider, OnApplicationBootstrap, OnModuleDestroy
{
    private readonly logger = new Logger(ExpoPushProvider.name);
    private readonly expo = new Expo({
        accessToken: this.config.expo.accessToken,
    });
    // the pushes Expo accepted, whose receipts say whether they reached the device; by ticket id, oldest first
    private readonly tickets = new Map<
        string,
        { token: string; sentAt: number }
    >();
    private timer?: NodeJS.Timeout;
    private checking?: Promise<void>;

    constructor(
        @Inject(notificationsConfig.KEY)
        private readonly config: NotificationsConfig,

        private readonly devicesService: DevicesService,
    ) {}

    onApplicationBootstrap(): void {
        this.timer = setInterval(
            () => this.startCheck(),
            RECEIPT_CHECK_INTERVAL_MS,
        );
        this.timer.unref();
    }

    async onModuleDestroy(): Promise<void> {
        clearInterval(this.timer);
        await this.checking;
    }

    isValidToken({ token }: TokenInput): boolean {
        return Expo.isExpoPushToken(token);
    }

    /** Sends the pushes in Expo's chunks, reporting the tokens Expo no longer knows and the pushes it refused. */
    async send({ pushes }: PushSendInput): Promise<PushSendOutput> {
        const invalidTokens: string[] = [];
        const failures: PushFailure[] = [];
        const sendable: {
            index: number;
            token: string;
            message: ExpoPushMessage;
        }[] = [];

        for (const [index, { token, message }] of pushes.entries())
            if (Expo.isExpoPushToken(token))
                sendable.push({
                    index,
                    token,
                    message: { to: token, ...message },
                });
            else invalidTokens.push(token);

        // the SDK limits how many requests run at once; a message per token, so the tickets line up with `sendable`
        const tickets = (
            await Promise.all(
                this.expo
                    .chunkPushNotifications(
                        sendable.map(({ message }) => message),
                    )
                    .map((chunk) =>
                        this.expo
                            .sendPushNotificationsAsync(chunk)
                            // fails only this chunk's pushes, which are tried again
                            .catch((error: unknown) =>
                                chunk.map(() => ({
                                    status: 'failed' as const,
                                    error,
                                })),
                            ),
                    ),
            )
        ).flat();

        for (const [position, ticket] of tickets.entries()) {
            const pushed = sendable[position];

            if (!pushed) continue;

            const { index, token } = pushed;

            if (ticket.status === 'ok') {
                this.remember({ id: ticket.id, token });
                continue;
            }

            if (ticket.status === 'failed') {
                failures.push({ index, error: ticket.error });
                continue;
            }

            const refused = `Expo refused the push: ${ticket.message}`;

            switch (ticket.details?.error) {
                case 'DeviceNotRegistered':
                    invalidTokens.push(token);
                    break;

                // the access token is wrong, so every later push would be refused too
                case 'InvalidCredentials':
                    throw new UndeliverableError(refused);

                // the same message would be refused again
                case 'MessageTooBig':
                case 'DeveloperError':
                    failures.push({
                        index,
                        error: new UndeliverableError(refused),
                    });
                    break;

                // rate limited, or Expo or Apple/Google failing for now
                default:
                    failures.push({ index, error: new Error(refused) });
            }
        }

        return { invalidTokens, failures };
    }

    /** Removes the devices the receipts of earlier pushes report as gone, which their tickets often do not. */
    async checkReceipts(): Promise<void> {
        const now = Date.now();
        const due: string[] = [];

        for (const [id, { sentAt }] of this.tickets) {
            if (sentAt > now - RECEIPT_DELAY_MS) break;
            due.push(id);
        }

        const gone: string[] = [];

        try {
            for (const ids of this.expo.chunkPushNotificationReceiptIds(due)) {
                const receipts =
                    await this.expo.getPushNotificationReceiptsAsync(ids);

                for (const id of ids) {
                    const ticket = this.tickets.get(id);
                    const receipt = receipts[id];

                    if (!ticket) continue;

                    // not there yet, unless Expo has since dropped it
                    if (!receipt) {
                        if (ticket.sentAt <= now - RECEIPT_TTL_MS)
                            this.tickets.delete(id);
                        continue;
                    }

                    this.tickets.delete(id);

                    if (receipt.status === 'ok') continue;

                    if (receipt.details?.error === 'DeviceNotRegistered')
                        gone.push(ticket.token);
                    else
                        this.logger.error(
                            `Expo could not deliver a push: ${receipt.message}`,
                        );
                }
            }
        } finally {
            // also when a later request fails, as the tickets of these are dropped already
            if (gone.length)
                await this.devicesService.unregister({ tokens: gone });
        }
    }

    // one check at a time; a failed one leaves its tickets for the next
    private startCheck(): void {
        this.checking ??= this.checkReceipts()
            .catch((error) =>
                this.logger.error('Could not check the Expo receipts', error),
            )
            .finally(() => {
                this.checking = undefined;
            });
    }

    private remember({ id, token }: { id: string; token: string }): void {
        if (this.tickets.size >= MAX_TICKETS)
            this.tickets.delete(this.tickets.keys().next().value as string);

        this.tickets.set(id, { token, sentAt: Date.now() });
    }
}
