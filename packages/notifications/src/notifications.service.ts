import { randomUUIDv7 } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import type { INotificationChannel } from './channels/channel.interface.js';
import { DeliveryWorker } from './delivery/delivery.worker.js';
import { DevicesService } from './devices/devices.service.js';
import {
    DATABASE_CHANNEL,
    NotificationsExplorer,
} from './discovery/notifications.explorer.js';
import {
    type NotificationOutput,
    toNotificationOutput,
} from './dto/notification.output.js';
import { NotificationEntity } from './entities/notification.entity.js';
import type { Notification } from './notification.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from './notifications.config.js';
import {
    DeliveryStatus,
    type InboxListInput,
    type InboxMarkReadInput,
    type ModelRef,
    type Notifiable,
    type SendInput,
    type SendOutput,
} from './types/types.js';

const INBOX_PAGE = 50;
// rendered and stored a batch at a time, so a large send never holds every message in memory;
// and as Postgres takes at most 65,535 parameters a statement
const SEND_BATCH = 1_000;

// every notification is a row, so the inbox is only the owner's rows that went to it
const inboxOf = ({ modelType, modelId }: ModelRef) => ({
    modelType,
    modelId,
    inbox: true,
});

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(NotificationEntity)
        private readonly notificationRepository: Repository<NotificationEntity>,

        private readonly explorer: NotificationsExplorer,

        private readonly deliveryWorker: DeliveryWorker,

        private readonly devicesService: DevicesService,

        @Inject(notificationsConfig.KEY)
        private readonly config: NotificationsConfig,
    ) {}

    /** Stores the notification for each recipient and resolves with their ids, in order; it is delivered afterwards. */
    async send({ recipients, notification }: SendInput): Promise<SendOutput> {
        const channels = this.channelsFor({ notification });

        // half an owner is a caller's mistake, which storing it as no owner would hide
        if (
            recipients.some(
                ({ modelType, modelId }) =>
                    (modelType == null) !== (modelId == null),
            )
        )
            throw new TypeError(
                'A recipient needs both modelType and modelId, or neither',
            );

        if (!recipients.length) return { ids: [] };

        const ids: string[] = [];

        // in one transaction, so a send is stored whole or not at all; insert, not save(), which would first look up every id
        await this.notificationRepository.manager.transaction(
            async (manager) => {
                for (let i = 0; i < recipients.length; i += SEND_BATCH) {
                    const batch = recipients.slice(i, i + SEND_BATCH);
                    const rows = await Promise.all(
                        batch.map((recipient) =>
                            this.toRow({ recipient, notification, channels }),
                        ),
                    );
                    await manager.insert(NotificationEntity, rows);
                    ids.push(...rows.map(({ id }) => id));
                }
            },
        );

        this.deliveryWorker.startSweep();

        return { ids };
    }

    /** The owner's inbox, newest first, a page at a time. */
    async list({
        after,
        limit = INBOX_PAGE,
        ...model
    }: InboxListInput): Promise<NotificationOutput[]> {
        const notifications = await this.notificationRepository.find({
            where: {
                ...inboxOf(model),
                ...(after ? { id: LessThan(after) } : {}),
            },
            // a UUIDv7 sorts by when it was made
            order: { id: 'DESC' },
            take: limit,
        });

        return notifications.map(toNotificationOutput);
    }

    /** How many notifications in the owner's inbox are unread. */
    async unreadCount({ modelType, modelId }: ModelRef): Promise<number> {
        return this.notificationRepository.countBy({
            ...inboxOf({ modelType, modelId }),
            readAt: IsNull(),
        });
    }

    /** Marks those of the ids that are unread in the owner's inbox as read; resolves with how many. */
    async markRead({ ids, ...model }: InboxMarkReadInput): Promise<number> {
        if (!ids.length) return 0;

        const { affected } = await this.notificationRepository.update(
            { ...inboxOf(model), id: In(ids), readAt: IsNull() },
            { readAt: new Date() },
        );

        return affected ?? 0;
    }

    /** Marks the owner's whole inbox as read; resolves with how many were unread. */
    async markAllRead({ modelType, modelId }: ModelRef): Promise<number> {
        const { affected } = await this.notificationRepository.update(
            { ...inboxOf({ modelType, modelId }), readAt: IsNull() },
            { readAt: new Date() },
        );

        return affected ?? 0;
    }

    /** Deletes a model's notifications, every one and not only its inbox, and its devices; call it when deleting the model, as no foreign key cascades. */
    async deleteForModel({
        modelType,
        modelId,
    }: ModelRef): Promise<{ notifications: number; devices: number }> {
        const [{ affected }, devices] = await Promise.all([
            this.notificationRepository.delete({ modelType, modelId }),
            this.devicesService.unregisterFor({ modelType, modelId }),
        ]);

        return { notifications: affected ?? 0, devices };
    }

    private async toRow({
        recipient,
        notification,
        channels,
    }: {
        recipient: Notifiable;
        notification: Notification;
        channels: { name: string; channel: INotificationChannel }[];
    }): Promise<NotificationEntity> {
        const id = randomUUIDv7();
        const locale = recipient.locale ?? this.config.defaultLocale;
        const deliveries = await Promise.all(
            channels.map(async ({ name, channel }) => {
                const message = await channel.render({
                    notification,
                    id,
                    recipient,
                    locale,
                });

                return [
                    name,
                    {
                        message,
                        status:
                            message === null
                                ? DeliveryStatus.Skipped
                                : DeliveryStatus.Pending,
                        attempts: 0,
                    },
                ] as const;
            }),
        );
        const row = this.notificationRepository.create({
            id,
            modelType: recipient.modelType ?? null,
            modelId: recipient.modelId ?? null,
            type: notification.type,
            payload: notification.payload,
            deliveries: Object.fromEntries(deliveries),
        });

        row.inbox =
            notification.channels.includes(DATABASE_CHANNEL) &&
            row.owner !== undefined;

        return row;
    }

    // checked before anything renders, so a notification listing an unknown channel stores nothing
    private channelsFor({ notification }: { notification: Notification }): {
        name: string;
        channel: INotificationChannel;
    }[] {
        return [...new Set(notification.channels)]
            .filter((name) => name !== DATABASE_CHANNEL)
            .flatMap((name) => {
                if (!this.explorer.knows({ name }))
                    throw new Error(
                        `"${notification.type}" lists the channel "${name}", which is not registered`,
                    );

                const channel = this.explorer.channel({ name });

                // switched off by config
                return channel ? [{ name, channel }] : [];
            });
    }
}
