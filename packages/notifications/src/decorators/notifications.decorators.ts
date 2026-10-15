import { DiscoveryService } from '@nestjs/core';

/** Registers a channel under the name notifications list it by, e.g. `@NotificationChannel('slack')`. */
export const NotificationChannel = DiscoveryService.createDecorator<string>();

/** Registers a push provider under the name devices record, e.g. `@PushProvider('apns')`. */
export const PushProvider = DiscoveryService.createDecorator<string>();

/** Registers a mail provider under the name config selects it by, e.g. `@MailProvider('postmark')`. */
export const MailProvider = DiscoveryService.createDecorator<string>();
