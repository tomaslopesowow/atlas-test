import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../decorators/notifications.decorators.js';
import { UndeliverableError } from '../delivery/undeliverable.error.js';
import { DevicesService } from '../devices/devices.service.js';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import type { DeviceEntity } from '../entities/device.entity.js';
import type { Notification, ToPush } from '../notification.js';
import {
    type ChannelRenderInput,
    type ChannelSendInput,
    type DeliveryResult,
    DeliveryStatus,
    type ModelRef,
    type PushMessage,
} from '../types/types.js';
import type { INotificationChannel } from './channel.interface.js';

const ownerKey = ({ modelType, modelId }: ModelRef) =>
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
        const devices = await this.devicesService.findFor({
            owners: deliveries.flatMap(({ owner }) => (owner ? [owner] : [])),
        });
        const devicesByOwner = new Map<string, DeviceEntity[]>();
        const byProvider = new Map<
            string,
            { index: number; push: { token: string; message: PushMessage } }[]
        >();

        for (const device of devices)
            append(devicesByOwner, ownerKey(device), device);

        for (const [index, { owner, message }] of deliveries.entries()) {
            const owned = owner ? devicesByOwner.get(ownerKey(owner)) : [];

            for (const { token, provider } of owned ?? [])
                append(byProvider, provider, {
                    index,
                    push: { token, message },
                });
        }

        const failures = new Map<number, unknown>();
        const delivered = new Set<number>();
        const invalidTokens = new Set<string>();

        // a permanent failure wins, as trying the delivery again cannot fix it
        const fail = (index: number, error: unknown) => {
            if (!(failures.get(index) instanceof UndeliverableError))
                failures.set(index, error);
        };

        await Promise.all(
            [...byProvider].map(async ([name, queued]) => {
                const provider = this.explorer.pushProvider({ name });

                if (!provider) {
                    this.logger.warn(
                        `Dropped ${queued.length} pushes for "${name}", which is not an active push provider`,
                    );
                    return;
                }

                try {
                    const sent = await provider.send({
                        pushes: queued.map(({ push }) => push),
                    });
                    const refused = new Map(
                        (sent.failures ?? []).map(({ index, error }) => [
                            index,
                            error,
                        ]),
                    );
                    const gone = new Set(sent.invalidTokens);

                    for (const [position, { index, push }] of queued.entries())
                        if (refused.has(position))
                            fail(index, refused.get(position));
                        else if (!gone.has(push.token)) delivered.add(index);

                    for (const token of gone) invalidTokens.add(token);
                } catch (error) {
                    for (const { index } of queued) fail(index, error);
                }
            }),
        );

        // the pushes are out, so failing here must not fail their deliveries
        if (invalidTokens.size)
            await this.devicesService
                .unregister({ tokens: [...invalidTokens] })
                .catch((error) =>
                    this.logger.error(
                        `Could not remove ${invalidTokens.size} invalid push tokens: ${error}`,
                    ),
                );

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
}
