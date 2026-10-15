import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import {
    DevicesService,
    InboxQueryInput,
    MarkReadInput,
    type NotificationOutput,
    NotificationService,
    RegisterDeviceInput,
} from '@repo/notifications';
import { type AuthUser, CurrentUser, userRef } from '../auth/current-user.js';

interface CountOutput {
    count: number;
}

interface DeviceOutput {
    token: string;
    provider: string;
    createdAt: Date;
}

/** The signed-in user's notifications and push devices. */
@Controller('me')
export class InboxController {
    constructor(
        private readonly notificationService: NotificationService,

        private readonly devicesService: DevicesService,
    ) {}

    /** Newest first; pass the last id as `after` for the next page. */
    @Get('notifications')
    async list(
        @CurrentUser() { id }: AuthUser,
        @Query() query: InboxQueryInput,
    ): Promise<NotificationOutput[]> {
        return this.notificationService.list({ ...query, owner: userRef(id) });
    }

    @Get('notifications/unread-count')
    async unreadCount(@CurrentUser() { id }: AuthUser): Promise<CountOutput> {
        return {
            count: await this.notificationService.unreadCount({
                owner: userRef(id),
            }),
        };
    }

    @Post('notifications/read')
    @HttpCode(HttpStatus.OK)
    async markRead(
        @CurrentUser() { id }: AuthUser,
        @Body() { ids }: MarkReadInput,
    ): Promise<CountOutput> {
        return {
            count: await this.notificationService.markRead({
                ids,
                owner: userRef(id),
            }),
        };
    }

    @Post('notifications/read-all')
    @HttpCode(HttpStatus.OK)
    async markAllRead(@CurrentUser() { id }: AuthUser): Promise<CountOutput> {
        return {
            count: await this.notificationService.markAllRead({
                owner: userRef(id),
            }),
        };
    }

    @Get('devices')
    async devices(@CurrentUser() { id }: AuthUser): Promise<DeviceOutput[]> {
        const devices = await this.devicesService.findFor({
            owners: [userRef(id)],
        });

        return devices.map(({ token, provider, createdAt }) => ({
            token,
            provider,
            createdAt,
        }));
    }

    @Post('devices')
    @HttpCode(HttpStatus.NO_CONTENT)
    async registerDevice(
        @CurrentUser() { id }: AuthUser,
        @Body() { token, provider }: RegisterDeviceInput,
    ): Promise<void> {
        await this.devicesService.register({
            token,
            provider,
            owner: userRef(id),
        });
    }

    // the package removes any token it is given, so only one of the user's own is passed on
    @Delete('devices/:token')
    @HttpCode(HttpStatus.NO_CONTENT)
    async unregisterDevice(
        @CurrentUser() { id }: AuthUser,
        @Param('token') token: string,
    ): Promise<void> {
        const devices = await this.devicesService.findFor({
            owners: [userRef(id)],
        });

        if (!devices.some((device) => device.token === token))
            throw new NotFoundException('You have no device with that token');

        await this.devicesService.unregister({ tokens: [token] });
    }
}
