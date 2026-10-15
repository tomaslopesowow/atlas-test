import { Controller, Get, Param } from '@nestjs/common';
import { ParseIdPipe } from '../common/id.js';
import type { UserProfileOutput } from './dto/user.output.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    /** What anyone signed in sees of a user: their name and avatar, never their email. */
    @Get(':id')
    async profile(
        @Param('id', ParseIdPipe) id: number,
    ): Promise<UserProfileOutput> {
        return this.usersService.findProfile({ id });
    }
}
