import { randomUUIDv7 } from 'node:crypto';
import type { Notification } from '../notification.js';
import type { SendInput, SendOutput } from '../types/types.js';

/** Stands in for NotificationService in an app's unit tests: records each send, and stores or delivers nothing. */
export class FakeNotificationService {
    readonly sent: SendInput[] = [];

    async send({ recipients, notification }: SendInput): Promise<SendOutput> {
        this.sent.push({ recipients, notification });

        return { ids: recipients.map(() => randomUUIDv7()) };
    }

    /** The sends of one notification class, e.g. `sentOf({ notification: WelcomeNotification })`. */
    sentOf<T extends Notification>({
        notification,
    }: {
        notification: new (...args: never[]) => T;
    }): (SendInput & { notification: T })[] {
        return this.sent.filter(
            (send): send is SendInput & { notification: T } =>
                send.notification instanceof notification,
        );
    }
}
