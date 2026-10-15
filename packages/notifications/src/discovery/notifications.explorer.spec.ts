import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Injectable, Scope, type Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
    MailProvider,
    NotificationChannel,
    PushProvider,
} from '../decorators/notifications.decorators.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../notifications.config.js';
import { NotificationsExplorer } from './notifications.explorer.js';

class FakeChannel {
    async render() {
        return null;
    }

    async send() {
        return [];
    }
}

class FakePushProvider {
    async send() {
        return { invalidTokens: [] };
    }
}

class FakeMailProvider {
    async send() {}
}

@Injectable()
@NotificationChannel('slack')
class SlackChannel extends FakeChannel {}

@Injectable()
@NotificationChannel('slack')
class OtherSlackChannel extends FakeChannel {}

@Injectable()
@NotificationChannel('database')
class DatabaseChannel extends FakeChannel {}

@Injectable()
@NotificationChannel('push')
class PushChannel extends FakeChannel {}

@Injectable()
@NotificationChannel('mail')
class MailChannel extends FakeChannel {}

@Injectable({ scope: Scope.REQUEST })
@NotificationChannel('teams')
class RequestScopedChannel extends FakeChannel {}

@Injectable()
@PushProvider('expo')
class ExpoProvider extends FakePushProvider {}

@Injectable()
@PushProvider('expo')
class OtherExpoProvider extends FakePushProvider {}

@Injectable()
@PushProvider('apns')
class ApnsProvider extends FakePushProvider {}

@Injectable()
@MailProvider('smtp')
class SmtpProvider extends FakeMailProvider {}

@Injectable()
@MailProvider('smtp')
class OtherSmtpProvider extends FakeMailProvider {}

@Injectable()
@MailProvider('postmark')
class PostmarkProvider extends FakeMailProvider {}

const everything = [
    SlackChannel,
    PushChannel,
    MailChannel,
    ExpoProvider,
    ApnsProvider,
    SmtpProvider,
    PostmarkProvider,
];

interface ExploreInput {
    providers?: Type[];
    mail?: string;
    push?: string[];
}

/** Boots the explorer among `providers`, so `onModuleInit` collects them as an app would. */
const explore = async ({
    providers = everything,
    mail,
    push = [],
}: ExploreInput = {}) => {
    const module = await Test.createTestingModule({
        imports: [DiscoveryModule],
        providers: [
            NotificationsExplorer,
            {
                provide: notificationsConfig.KEY,
                useValue: {
                    mail: { provider: mail },
                    push: { providers: push },
                } as NotificationsConfig,
            },
            ...providers,
        ],
    }).compile();

    await module.init();

    return { explorer: module.get(NotificationsExplorer), module };
};

describe('NotificationsExplorer registration', () => {
    for (const [kind, twin] of [
        ['channels', OtherSlackChannel],
        ['push providers', OtherExpoProvider],
        ['mail providers', OtherSmtpProvider],
    ] as const)
        it(`refuses two ${kind} with one name`, async () => {
            await assert.rejects(
                explore({ providers: [...everything, twin] }),
                new RegExp(`Two ${kind} are named`),
            );
        });

    it('refuses an app channel named "database", which the inbox is', async () => {
        await assert.rejects(
            explore({ providers: [...everything, DatabaseChannel] }),
            /No channel can be named "database"/,
        );
    });

    it('refuses a configured mail provider nobody registered', async () => {
        await assert.rejects(
            explore({ mail: 'mailgun' }),
            /NOTIFICATIONS_MAIL_PROVIDER is "mailgun"/,
        );
    });

    it('refuses a configured push provider nobody registered', async () => {
        await assert.rejects(
            explore({ push: ['expo', 'fcm'] }),
            /NOTIFICATIONS_PUSH_PROVIDERS names "fcm"/,
        );
    });

    it('boots alongside a request-scoped provider', async () => {
        await assert.doesNotReject(
            explore({ providers: [...everything, RequestScopedChannel] }),
        );
    });

    it('skips a request-scoped provider, which has no instance at startup', async () => {
        const { explorer } = await explore({
            providers: [...everything, RequestScopedChannel],
        });

        assert.equal(explorer.knows({ name: 'teams' }), false);
        assert.equal(explorer.channel({ name: 'teams' }), undefined);
    });
});

describe('NotificationsExplorer.knows', () => {
    it('knows the inbox and every registered channel, but nothing else', async () => {
        const { explorer } = await explore();

        assert.equal(explorer.knows({ name: 'database' }), true);
        assert.equal(explorer.knows({ name: 'slack' }), true);
        assert.equal(explorer.knows({ name: 'mail' }), true);
        assert.equal(explorer.knows({ name: 'sms' }), false);
    });
});

describe('NotificationsExplorer.channel', () => {
    it('switches push and mail off while config names no provider for them', async () => {
        const { explorer } = await explore();

        assert.equal(explorer.channel({ name: 'push' }), undefined);
        assert.equal(explorer.channel({ name: 'mail' }), undefined);
    });

    it('returns push and mail once config names their providers', async () => {
        const { explorer, module } = await explore({
            mail: 'smtp',
            push: ['expo'],
        });

        assert.equal(
            explorer.channel({ name: 'push' }),
            module.get(PushChannel),
        );
        assert.equal(
            explorer.channel({ name: 'mail' }),
            module.get(MailChannel),
        );
    });

    it("keeps the app's own channels on whatever config says", async () => {
        const { explorer, module } = await explore();

        assert.equal(
            explorer.channel({ name: 'slack' }),
            module.get(SlackChannel),
        );
        assert.equal(explorer.channel({ name: 'sms' }), undefined);
    });
});

describe('NotificationsExplorer providers', () => {
    it('returns only the push providers config switches on', async () => {
        const { explorer, module } = await explore({ push: ['expo'] });

        assert.equal(
            explorer.pushProvider({ name: 'expo' }),
            module.get(ExpoProvider),
        );
        assert.equal(explorer.pushProvider({ name: 'apns' }), undefined);
        assert.equal(explorer.pushProvider({ name: 'fcm' }), undefined);
    });

    it('returns the mail provider config names', async () => {
        const { explorer, module } = await explore({ mail: 'postmark' });

        assert.equal(explorer.mailProvider(), module.get(PostmarkProvider));
    });

    it('returns no mail provider while mail is off', async () => {
        const { explorer } = await explore();

        assert.equal(explorer.mailProvider(), undefined);
    });
});
