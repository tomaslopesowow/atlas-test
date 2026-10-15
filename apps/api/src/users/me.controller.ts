import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Put,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { MediaFileInterceptor, type MediaUrlsOutput } from '@repo/media';
import { type AuthUser, CurrentUser } from '../auth/current-user.js';
import { UserUpdateInput } from './dto/user.input.js';
import type { MeOutput } from './dto/user.output.js';
import { UsersService } from './users.service.js';

@Controller('me')
export class MeController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    async show(@CurrentUser() { id }: AuthUser): Promise<MeOutput> {
        return this.usersService.findMe({ id });
    }

    @Patch()
    async update(
        @CurrentUser() { id }: AuthUser,
        @Body() { name }: UserUpdateInput,
    ): Promise<MeOutput> {
        return this.usersService.update({ id, name });
    }

    /** Multipart, the image in `file`; it replaces the avatar there was, and its sizes are made after the response. */
    @Put('avatar')
    @UseInterceptors(MediaFileInterceptor('file'))
    async setAvatar(
        @CurrentUser() { id }: AuthUser,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<MediaUrlsOutput> {
        return this.usersService.setAvatar({ id, file });
    }

    @Delete('avatar')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeAvatar(@CurrentUser() { id }: AuthUser): Promise<void> {
        await this.usersService.removeAvatar({ id });
    }
}
