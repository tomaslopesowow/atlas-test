import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { type DiscoverableDecorator, DiscoveryService } from '@nestjs/core';
import type { INotificationChannel } from '../channels/channel.interface.js';
import {
    MailProvider,
    NotificationChannel,
    PushProvider,
} from '../decorators/notifications.decorators.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../notifications.config.js';
import type { IMailProvider } from '../providers/mail/mail-provider.interface.js';
import type { IPushProvider } from '../providers/push/push-provider.interface.js';
import type { NameInput } from '../types/types.js';

/** The inbox, which every notification row already is, so no channel can take the name. */
export const DATABASE_CHANNEL = 'database';

@Injectable()
export class NotificationsExplorer implements OnModuleInit {
    private readonly channels = new Map<string, INotificationChannel>();
    private readonly pushProviders = new Map<string, IPushProvider>();
    private readonly mailProviders = new Map<string, IMailProvider>();

    constructor(
        private readonly discovery: DiscoveryService,

        @Inject(notificationsConfig.KEY)
        private readonly config: NotificationsConfig,
    ) {}

    // every instance exists by now, and nothing has sent yet
    onModuleInit(): void {
        this.collect({
            decorator: NotificationChannel,
            into: this.channels,
            kind: 'channel',
        });
        this.collect({
            decorator: PushProvider,
            into: this.pushProviders,
            kind: 'push provider',
        });
        this.collect({
            decorator: MailProvider,
            into: this.mailProviders,
            kind: 'mail provider',
        });

        if (this.channels.has(DATABASE_CHANNEL))
            throw new Error(
                `No channel can be named "${DATABASE_CHANNEL}", the inbox is`,
            );

        const { mail, push } = this.config;

        if (mail.provider && !this.mailProviders.has(mail.provider))
            throw new Error(
                `NOTIFICATIONS_MAIL_PROVIDER is "${mail.provider}", but no @MailProvider() has that name`,
            );

        for (const name of push.providers)
            if (!this.pushProviders.has(name))
                throw new Error(
                    `NOTIFICATIONS_PUSH_PROVIDERS names "${name}", but no @PushProvider() has that name`,
                );
    }

    /** Whether a notification may list the channel: the inbox, or a registered one. */
    knows({ name }: NameInput): boolean {
        return name === DATABASE_CHANNEL || this.channels.has(name);
    }

    /** The registered channel, unless config switches it off by naming no provider for it. */
    channel({ name }: NameInput): INotificationChannel | undefined {
        if (name === 'push' && !this.config.push.providers.length)
            return undefined;
        if (name === 'mail' && !this.config.mail.provider) return undefined;

        return this.channels.get(name);
    }

    /** A push provider that config switches on. */
    pushProvider({ name }: NameInput): IPushProvider | undefined {
        return this.config.push.providers.includes(name)
            ? this.pushProviders.get(name)
            : undefined;
    }

    /** The mail provider config names, if any. */
    mailProvider(): IMailProvider | undefined {
        const { provider } = this.config.mail;

        return provider ? this.mailProviders.get(provider) : undefined;
    }

    private collect<T>({
        decorator,
        into,
        kind,
    }: {
        decorator: DiscoverableDecorator<string>;
        into: Map<string, T>;
        kind: string;
    }): void {
        for (const wrapper of this.discovery.getProviders({
            metadataKey: decorator.KEY,
        })) {
            const name = this.discovery.getMetadataByDecorator(
                decorator,
                wrapper,
            );

            // a request-scoped provider only has a stand-in at startup, whose constructor never ran
            if (!name || !wrapper.isDependencyTreeStatic() || !wrapper.instance)
                continue;

            if (into.has(name))
                throw new Error(`Two ${kind}s are named "${name}"`);

            into.set(name, wrapper.instance as T);
        }
    }
}
