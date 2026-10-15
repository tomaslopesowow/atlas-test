import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { type AuthUser, CurrentUser } from '../auth/current-user.js';
import { ParseIdPipe } from '../common/id.js';
import { AfterPageQuery } from '../common/page.query.js';
import { CommentsService } from './comments.service.js';
import { CommentInput } from './dto/post.input.js';
import type { CommentOutput } from './dto/post.output.js';

@Controller()
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    @Post('posts/:id/comments')
    async create(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) postId: number,
        @Body() { body }: CommentInput,
    ): Promise<CommentOutput> {
        return this.commentsService.create({ userId, postId, body });
    }

    /** Oldest first; pass the last id as `after` for the next page. */
    @Get('posts/:id/comments')
    async list(
        @Param('id', ParseIdPipe) postId: number,
        @Query() { after, limit }: AfterPageQuery,
    ): Promise<CommentOutput[]> {
        return this.commentsService.list({ postId, after, limit });
    }

    @Delete('comments/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
    ): Promise<void> {
        await this.commentsService.delete({ id, userId });
    }
}
