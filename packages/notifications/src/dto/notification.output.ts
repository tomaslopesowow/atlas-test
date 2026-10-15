import type { NotificationEntity } from '../entities/notification.entity.js';

export class NotificationOutput {
    id!: string;
    type!: string;
    payload!: object;
    readAt!: Date | null;
    createdAt!: Date;
}

export function toNotificationOutput(
    notification: NotificationEntity,
): NotificationOutput {
    return {
        id: notification.id,
        type: notification.type,
        payload: notification.payload,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
    };
}
