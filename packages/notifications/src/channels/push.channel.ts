import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../decorators/notifications.decorators.js';
import { UndeliverableError } from '../delivery/undeliverable.error.js';
import { DevicesService } from '../devices/devices.service.js';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import type { DeviceEntity } from '../entities/device.entity.js';
import type { Notification, ToPush } from '../notification.js';
import type { IPushProvider } from '../providers/push/push-provider.interface.js';
import {
    type ChannelRenderInput,
    type ChannelSendInput,
    type DeliveryResult,
    DeliveryStatus,
    type NotificationOwner,
    type PushBatchesInput,
    type PushMessage,
    type PushSendInput,
    type TokensInput,
} from '../types/types.js';
import { chunk, forEachLimited } from '../utils.js';
import type { INotificationChannel } from './channel.interface.js';

const DEFAULT_BATCH_SIZE = 100;

// per provider, enough to keep a large batch moving without flooding it
const CONCURRENT_REQUESTS = 10;

/** One push, with the position of the delivery it belongs to. */
interface QueuedPush {
    index: number;
    push: PushSendInput['pushes'][number];
}

/** A provider's pushes, a request per batch. */
interface ProviderBatches {
    provider: IPushProvider;
    batches: QueuedPush[][];
}

const ownerKey = ({ modelType, modelId }: NotificationOwner) =>
    `${modelType}:${modelId}`;

const append = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
    const values = map.get(key);

    if (values) values.push(value);
    else map.set(key, [value]);
};

const rendersPush = (
    notification: Notification,
): notification is Notification & ToPush =>
    typeof (notification as Partial<ToPush>).toPush === 'function';

@Injectable()
@NotificationChannel('push')
export class PushChannel implements INotificationChannel<PushMessage> {
    private readonly logger = new Logger(PushChannel.name);

    constructor(
        private readonly devicesService: DevicesService,

        private readonly explorer: NotificationsExplorer,
    ) {}

    /** The notification's push, carrying its id so the app can open it; null for a recipient without an owner. */
    async render({
        notification,
        id,
        recipient,
        locale,
    }: ChannelRenderInput): Promise<PushMessage | null> {
        // devices belong to an owner, so a recipient reached by address alone has none
        if (recipient.modelType == null || recipient.modelId == null)
            return null;

        if (!rendersPush(notification))
            throw new TypeError(
                `"${notification.type}" lists the push channel but has no toPush()`,
            );

        const message = await notification.toPush({
            id,
            recipient,
            payload: notification.payload,
            locale,
        });

        return { ...message, data: { ...message.data, notificationId: id } };
    }

    /** Sends each delivery to every device of its owner, removing the tokens the providers reject. */
    async send({
        deliveries,
    }: ChannelSendInput<PushMessage>): Promise<DeliveryResult[]> {
        const owners = new Map<string, NotificationOwner>();

        for (const { owner } of deliveries)
            if (owner) owners.set(ownerKey(owner), owner);

        const devices = await this.devicesService.findFor({
            owners: [...owners.values()],
        });
        const byProvider = this.batches({ deliveries, devices });

        const failures = new Map<number, unknown>();
        const delivered = new Set<number>();
        const invalidTokens = new Set<string>();

        // a permanent failure wins, as trying the delivery again cannot fix it
        const fail = (index: number, error: unknown) => {
            if (!(failures.get(index) instanceof UndeliverableError))
                failures.set(index, error);
        };

        const sendBatch = async (
            provider: IPushProvider,
            batch: QueuedPush[],
        ) => {
            try {
                const sent = await provider.send({
                    pushes: batch.map(({ push }) => push),
                });
                const refused = new Map(
                    (sent.failures ?? []).map(({ index, error }) => [
                        index,
                        error,
                    ]),
                );
                const gone = new Set(sent.invalidTokens);

                for (const [position, { index, push }] of batch.entries()) {
                    if (refused.has(position))
                        fail(index, refused.get(position));
                    else if (!gone.has(push.token)) delivered.add(index);
                }

                for (const token of gone) invalidTokens.add(token);
            } catch (error) {
                for (const { index } of batch) fail(index, error);
            }
        };

        // each provider at its own limit, so a slow one holds back no other
        await Promise.all(
            byProvider.map(({ provider, batches }) =>
                forEachLimited(
                    batches,
                    provider.concurrency ?? CONCURRENT_REQUESTS,
                    (batch) => sendBatch(provider, batch),
                ),
            ),
        );

        await this.removeInvalid({ tokens: [...invalidTokens] });

        // sent once a push reached a device; none reaching one, as when every token was gone, skips it
        return deliveries.map((_, index): DeliveryResult => {
            if (failures.has(index))
                return {
                    status: DeliveryStatus.Failed,
                    error: failures.get(index),
                };

            return {
                status: delivered.has(index)
                    ? DeliveryStatus.Sent
                    : DeliveryStatus.Skipped,
            };
        });
    }

    // a push per delivery and device of its owner, chunked per provider to its batch size
    private batches({
        deliveries,
        devices,
    }: PushBatchesInput): ProviderBatches[] {
        const devicesByOwner = new Map<string, DeviceEntity[]>();
        const pushesByProvider = new Map<string, QueuedPush[]>();

        for (const device of devices)
            append(devicesByOwner, ownerKey(device), device);

        for (const [index, { owner, message }] of deliveries.entries()) {
            const owned = owner ? devicesByOwner.get(ownerKey(owner)) : [];

            for (const { token, provider } of owned ?? [])
                append(pushesByProvider, provider, {
                    index,
                    push: { token, message },
                });
        }

        const byProvider: ProviderBatches[] = [];

        for (const [name, pushes] of pushesByProvider) {
            const provider = this.explorer.pushProvider({ name });

            if (provider)
                byProvider.push({
                    provider,
                    batches: chunk(
                        pushes,
                        provider.batchSize ?? DEFAULT_BATCH_SIZE,
                    ),
                });
            else
                this.logger.warn(
                    `Dropped ${pushes.length} pushes for "${name}", which is not an active push provider`,
                );
        }

        return byProvider;
    }

    // the pushes are out, so failing here must not fail their deliveries
    private async removeInvalid({ tokens }: TokensInput): Promise<void> {
        if (tokens.length === 0) return;

        try {
            await this.devicesService.unregister({ tokens });
        } catch (error) {
            this.logger.error(
                `Could not remove ${tokens.length} invalid push tokens: ${error}`,
            );
        }
    }
}
