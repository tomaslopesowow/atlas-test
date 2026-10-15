import { randomUUIDv7 } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { DeliveryWorker } from './delivery/delivery.worker.js';
import {
    DATABASE_CHANNEL,
    NotificationsExplorer,
} from './discovery/notifications.explorer.js';
import {
    type NotificationOutput,
    toNotificationOutput,
} from './dto/notification.output.js';
import { NotificationEntity } from './entities/notification.entity.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from './notifications.config.js';
import {
    DeliveryStatus,
    type InboxListInput,
    type InboxMarkReadInput,
    type NamedChannel,
    type NotificationInput,
    type NotificationOwner,
    type OwnerInput,
    type SendInput,
    type SendOutput,
} from './types/types.js';
import { chunk } from './utils.js';

const INBOX_PAGE = 50;
const INSERT_BATCH = 1_000;

// every notification is a row, so the inbox is only the owner's rows that went to it
const inboxOf = ({ modelType, modelId }: NotificationOwner) => ({
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

        const toInbox = notification.channels.includes(DATABASE_CHANNEL);
        const notifications = await Promise.all(
            recipients.map(async (recipient) => {
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

                row.inbox = toInbox && row.owner !== undefined;

                return row;
            }),
        );

        // not save(), which would first look up every id it is given; in parts, as Postgres takes
        // at most 65,535 parameters a statement, and in one transaction, so a send is stored whole or not at all
        await this.notificationRepository.manager.transaction(
            async (manager) => {
                for (const batch of chunk(notifications, INSERT_BATCH))
                    await manager.insert(NotificationEntity, batch);
            },
        );

        const pending = notifications.filter(({ deliveries }) =>
            Object.values(deliveries).some(
                ({ status }) => status === DeliveryStatus.Pending,
            ),
        );

        if (pending.length)
            void this.deliveryWorker.run({ notifications: pending });

        return { ids: notifications.map(({ id }) => id) };
    }

    /** The owner's inbox, newest first, a page at a time. */
    async list({
        owner,
        after,
        limit = INBOX_PAGE,
    }: InboxListInput): Promise<NotificationOutput[]> {
        const notifications = await this.notificationRepository.find({
            where: {
                ...inboxOf(owner),
                ...(after ? { id: LessThan(after) } : {}),
            },
            // a UUIDv7 sorts by when it was made
            order: { id: 'DESC' },
            take: limit,
        });

        return notifications.map(toNotificationOutput);
    }

    /** How many notifications in the owner's inbox are unread. */
    async unreadCount({ owner }: OwnerInput): Promise<number> {
        return this.notificationRepository.countBy({
            ...inboxOf(owner),
            readAt: IsNull(),
        });
    }

    /** Marks those of the ids that are unread in the owner's inbox as read; resolves with how many. */
    async markRead({ owner, ids }: InboxMarkReadInput): Promise<number> {
        if (!ids.length) return 0;

        const { affected } = await this.notificationRepository.update(
            { ...inboxOf(owner), id: In(ids), readAt: IsNull() },
            { readAt: new Date() },
        );

        return affected ?? 0;
    }

    /** Marks the owner's whole inbox as read; resolves with how many were unread. */
    async markAllRead({ owner }: OwnerInput): Promise<number> {
        const { affected } = await this.notificationRepository.update(
            { ...inboxOf(owner), readAt: IsNull() },
            { readAt: new Date() },
        );

        return affected ?? 0;
    }

    // checked before anything renders, so a notification listing an unknown channel stores nothing
    private channelsFor({ notification }: NotificationInput): NamedChannel[] {
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
