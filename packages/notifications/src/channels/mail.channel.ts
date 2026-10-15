import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannel } from '../decorators/notifications.decorators.js';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import type { Notification, ToMail } from '../notification.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../notifications.config.js';
import type { IMailProvider } from '../providers/mail/mail-provider.interface.js';
import {
    type ChannelRenderInput,
    type ChannelSendInput,
    type DeliveryResult,
    DeliveryStatus,
    type MailMessage,
} from '../types/types.js';
import { forEachLimited } from '../utils.js';
import type { INotificationChannel } from './channel.interface.js';

const CONCURRENCY = 10;

const rendersMail = (
    notification: Notification,
): notification is Notification & ToMail =>
    typeof (notification as Partial<ToMail>).toMail === 'function';

@Injectable()
@NotificationChannel('mail')
export class MailChannel implements INotificationChannel<MailMessage> {
    constructor(
        private readonly explorer: NotificationsExplorer,

        @Inject(notificationsConfig.KEY)
        private readonly config: NotificationsConfig,
    ) {}

    /** The whole mail, sender included, so any process can send it as stored. */
    async render({
        notification,
        id,
        recipient,
        locale,
    }: ChannelRenderInput): Promise<MailMessage | null> {
        if (!recipient.email) return null;

        if (!rendersMail(notification))
            throw new TypeError(
                `"${notification.type}" lists the mail channel but has no toMail()`,
            );

        const content = await notification.toMail({
            id,
            recipient,
            payload: notification.payload,
            locale,
        });

        // the type asks for a body, but a cast or an empty string gets past it
        if (!content.html && !content.text)
            throw new TypeError(
                `"${notification.type}" rendered a mail with neither html nor text`,
            );

        return {
            to: recipient.email,
            // config requires MAIL_FROM whenever a mail provider is set
            from: this.config.mail.from as string,
            ...content,
        };
    }

    async send({
        deliveries,
    }: ChannelSendInput<MailMessage>): Promise<DeliveryResult[]> {
        // the explorer only hands out this channel while a mail provider is configured, and boot checked it exists
        const provider = this.explorer.mailProvider() as IMailProvider;
        const results: DeliveryResult[] = [];

        await forEachLimited(
            [...deliveries.entries()],
            CONCURRENCY,
            async ([index, { message }]) => {
                try {
                    await provider.send({ mail: message });
                    results[index] = { status: DeliveryStatus.Sent };
                } catch (error) {
                    results[index] = { status: DeliveryStatus.Failed, error };
                }
            },
        );

        return results;
    }
}
