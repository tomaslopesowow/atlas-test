import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Put,
    Query,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { MediaFileInterceptor } from '@repo/media';
import { type AuthUser, CurrentUser } from '../auth/current-user.js';
import { ParseIdPipe } from '../common/id.js';
import { BeforePageQuery } from '../common/page.query.js';
import { PostInput } from './dto/post.input.js';
import type {
    LikeOutput,
    PostImageOutput,
    PostOutput,
} from './dto/post.output.js';
import { PostsService } from './posts.service.js';

@Controller()
export class PostsController {
    constructor(private readonly postsService: PostsService) {}

    @Post('posts')
    async create(
        @CurrentUser() { id: userId }: AuthUser,
        @Body() { body }: PostInput,
    ): Promise<PostOutput> {
        return this.postsService.create({ userId, body });
    }

    /** Everyone's posts, newest first; pass the last id as `before` for the next page. */
    @Get('posts')
    async feed(
        @CurrentUser() { id: viewerId }: AuthUser,
        @Query() { before, limit }: BeforePageQuery,
    ): Promise<PostOutput[]> {
        return this.postsService.feed({ viewerId, before, limit });
    }

    @Get('users/:id/posts')
    async byAuthor(
        @CurrentUser() { id: viewerId }: AuthUser,
        @Param('id', ParseIdPipe) authorId: number,
        @Query() { before, limit }: BeforePageQuery,
    ): Promise<PostOutput[]> {
        return this.postsService.feed({ viewerId, authorId, before, limit });
    }

    @Get('posts/:id')
    async findOne(
        @CurrentUser() { id: viewerId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
    ): Promise<PostOutput> {
        return this.postsService.findOne({ viewerId, id });
    }

    @Patch('posts/:id')
    async update(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
        @Body() { body }: PostInput,
    ): Promise<PostOutput> {
        return this.postsService.update({ id, userId, body });
    }

    @Delete('posts/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
    ): Promise<void> {
        await this.postsService.delete({ id, userId });
    }

    /** Multipart, the image in `file`. */
    @Post('posts/:id/images')
    @UseInterceptors(MediaFileInterceptor('file'))
    async addImage(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<PostImageOutput> {
        return this.postsService.addImage({ id, userId, file });
    }

    @Delete('posts/:id/images/:mediaId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeImage(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
        @Param('mediaId', ParseUUIDPipe) mediaId: string,
    ): Promise<void> {
        await this.postsService.removeImage({ id, userId, mediaId });
    }

    @Put('posts/:id/like')
    async like(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
    ): Promise<LikeOutput> {
        return this.postsService.like({ id, userId });
    }

    @Delete('posts/:id/like')
    async unlike(
        @CurrentUser() { id: userId }: AuthUser,
        @Param('id', ParseIdPipe) id: number,
    ): Promise<LikeOutput> {
        return this.postsService.unlike({ id, userId });
    }
}
