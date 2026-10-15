import { Module } from '@nestjs/common';
import { NotificationsModule } from '@repo/notifications';
import { InboxController } from './inbox.controller.js';

@Module({
    imports: [NotificationsModule],
    controllers: [InboxController],
})
export class InboxModule {}
