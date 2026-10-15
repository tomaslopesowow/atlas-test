import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailChannel } from './channels/mail.channel.js';
import { PushChannel } from './channels/push.channel.js';
import { DeliveryWorker } from './delivery/delivery.worker.js';
import { DevicesService } from './devices/devices.service.js';
import { NotificationsExplorer } from './discovery/notifications.explorer.js';
import { DeviceEntity } from './entities/device.entity.js';
import { NotificationEntity } from './entities/notification.entity.js';
import { notificationsConfig } from './notifications.config.js';
import { NotificationService } from './notifications.service.js';
import { SmtpMailProvider } from './providers/mail/smtp-mail.provider.js';
import { ExpoPushProvider } from './providers/push/expo-push.provider.js';

/** For an app's migrations data source, which the TypeORM CLI fills without autoLoadEntities. */
export const NOTIFICATIONS_ENTITIES = [NotificationEntity, DeviceEntity];

// no forRoot: the app's own channels and providers are found by their decorators
@Module({
    imports: [
        ConfigModule.forFeature(notificationsConfig),
        DiscoveryModule,
        TypeOrmModule.forFeature(NOTIFICATIONS_ENTITIES),
    ],
    providers: [
        NotificationsExplorer,
        NotificationService,
        DevicesService,
        DeliveryWorker,
        PushChannel,
        MailChannel,
        ExpoPushProvider,
        SmtpMailProvider,
    ],
    exports: [NotificationService, DevicesService],
})
export class NotificationsModule {}
