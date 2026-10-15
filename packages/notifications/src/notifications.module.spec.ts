import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
    NotificationChannel,
    PushProvider,
} from './decorators/notifications.decorators.js';
import { DevicesService } from './devices/devices.service.js';
import { NotificationsExplorer } from './discovery/notifications.explorer.js';
import { DeviceEntity } from './entities/device.entity.js';
import { NotificationEntity } from './entities/notification.entity.js';
import { notificationsConfig } from './notifications.config.js';
import { NotificationsModule } from './notifications.module.js';
import { NotificationService } from './notifications.service.js';
import { DeliveryStatus } from './types/types.js';

@Injectable()
@NotificationChannel('slack')
class SlackChannel {
    render() {
        return { text: 'paid' };
    }

    async send() {
        return [{ status: DeliveryStatus.Sent }];
    }
}

@Injectable()
@PushProvider('apns')
class ApnsPushProvider {
    async send() {
        return { invalidTokens: [] };
    }
}

@Injectable()
class Billing {
    constructor(
        readonly notifications: NotificationService,
        readonly devices: DevicesService,
    ) {}
}

@Module({
    imports: [NotificationsModule],
    providers: [Billing, SlackChannel, ApnsPushProvider],
})
class BillingModule {}

const env = {
    NOTIFICATIONS_MAIL_PROVIDER: 'smtp',
    MAIL_FROM: 'hello@atlas.test',
    SMTP_HOST: 'localhost',
    NOTIFICATIONS_PUSH_PROVIDERS: 'expo,apns',
};

/** The app's side of the contract: a database behind the two repositories, and its environment. */
const boot = async (source: Record<string, string> = env) => {
    const module = await Test.createTestingModule({ imports: [BillingModule] })
        .overrideProvider(notificationsConfig.KEY)
        .useValue(notificationsConfig(source))
        .overrideProvider(getRepositoryToken(NotificationEntity))
        // the worker sweeps at boot, and finds nothing left to deliver
        .useValue({ find: async () => [] })
        .overrideProvider(getRepositoryToken(DeviceEntity))
        .useValue({})
        .compile();

    await module.init();

    return module;
};

describe('NotificationsModule', () => {
    it('gives an importing module the notification and device services', async () => {
        const module = await boot();
        const billing = module.get(Billing);

        assert.ok(billing.notifications instanceof NotificationService);
        assert.ok(billing.devices instanceof DevicesService);
        await module.close();
    });

    it("finds the app's own channel and push provider by their decorator alone, beside the built-in ones", async () => {
        const module = await boot();
        const explorer = module.get(NotificationsExplorer, { strict: false });

        assert.ok(explorer.channel({ name: 'slack' }) instanceof SlackChannel);
        assert.ok(
            explorer.pushProvider({ name: 'apns' }) instanceof ApnsPushProvider,
        );
        assert.ok(explorer.channel({ name: 'push' }));
        assert.ok(explorer.channel({ name: 'mail' }));
        assert.ok(explorer.mailProvider());
        await module.close();
    });

    it('refuses to boot when config names a push provider nobody registered', async () => {
        await assert.rejects(
            boot({ ...env, NOTIFICATIONS_PUSH_PROVIDERS: 'expo,fcm' }),
            /NOTIFICATIONS_PUSH_PROVIDERS names "fcm"/,
        );
    });
});
