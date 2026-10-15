import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
    ActionResponse,
    ActivityResponse,
    AdminSchema,
    DashboardResponse,
    DeleteResponse,
    ListResponse,
    MeResponse,
    OptionsResponse,
    RecordResponse,
    RelatedKeysResponse,
    RestoreResponse,
    SearchResponse,
    UploadResponse,
} from '@repo/admin-contract';
import { AdminService } from './admin.service.js';
import { AdminGuard } from './auth/admin.guard.js';
import { ResourceRegistry } from './registry/resource-registry.js';
import type { Query as QueryParams } from './types/types.js';

// the largest any upload may be, checked while it streams in; each file field checks its own after
const UPLOAD_LIMIT = 50 * 1024 * 1024;

// bodies and query strings are checked against each resource's fields in the service, not by DTOs
@Controller('admin/api')
@UseGuards(AdminGuard)
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly registry: ResourceRegistry,
    ) {}

    // who the app says made the request, kept with the change in the activity log
    private async actor({ request }: { request: object }) {
        return (
            (await this.registry.authenticator()?.actor({ request })) ?? null
        );
    }

    @Get('me')
    async me(@Req() request: object): Promise<MeResponse> {
        return { user: await this.actor({ request }) };
    }

    // signing in is the panel controller's, which is open; signing out needs a session, so it is here
    @Delete('session')
    @HttpCode(204)
    async logout(@Req() request: object): Promise<void> {
        await this.registry.authenticator()?.logout({ request });
    }

    @Get('schema')
    schema(): AdminSchema {
        return this.adminService.schema();
    }

    @Get('resources/:resource')
    list(
        @Param('resource') resource: string,
        @Query() query: QueryParams,
    ): Promise<ListResponse> {
        return this.adminService.list({ resource, query });
    }

    @Get('search')
    search(@Query('q') q: unknown): Promise<SearchResponse> {
        return this.adminService.search({ q });
    }

    @Get('activity')
    activity(
        @Query('resource') resource: unknown,
        @Query('page') page: unknown,
    ): Promise<ActivityResponse> {
        return this.adminService.activity({ resource, page });
    }

    @Get('dashboard')
    dashboard(@Query() query: QueryParams): Promise<DashboardResponse> {
        return this.adminService.dashboard({ query });
    }

    // before the record route, which would take "cards" for a key
    @Get('resources/:resource/cards')
    resourceCards(
        @Param('resource') resource: string,
        @Query() query: QueryParams,
    ): Promise<DashboardResponse> {
        return this.adminService.resourceCards({ resource, query });
    }

    @Post('resources/:resource/files/:field')
    @HttpCode(200)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: UPLOAD_LIMIT, files: 1 },
        }),
    )
    upload(
        @Param('resource') resource: string,
        @Param('field') field: string,
        // what of multer's file this uses, typed here so the package needs no @types/multer
        @UploadedFile()
        file:
            | {
                  buffer: Buffer;
                  originalname: string;
                  mimetype: string;
                  size: number;
              }
            | undefined,
    ): Promise<UploadResponse> {
        return this.adminService.upload({
            resource,
            field,
            file: file && {
                buffer: file.buffer,
                name: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
            },
        });
    }

    // before the record route, which would take "options" for a key
    @Get('resources/:resource/options')
    options(
        @Param('resource') resource: string,
        @Query() query: QueryParams,
    ): Promise<OptionsResponse> {
        return this.adminService.options({ resource, query });
    }

    @Get('resources/:resource/:key')
    show(
        @Param('resource') resource: string,
        @Param('key') key: string,
    ): Promise<RecordResponse> {
        return this.adminService.show({ resource, key });
    }

    @Post('resources/:resource')
    async create(
        @Param('resource') resource: string,
        @Body() input: unknown,
        @Req() request: object,
    ): Promise<RecordResponse> {
        return this.adminService.create({
            resource,
            input,
            actor: await this.actor({ request }),
        });
    }

    @Patch('resources/:resource/:key')
    async update(
        @Param('resource') resource: string,
        @Param('key') key: string,
        @Body() input: unknown,
        @Req() request: object,
    ): Promise<RecordResponse> {
        return this.adminService.update({
            resource,
            key,
            input,
            actor: await this.actor({ request }),
        });
    }

    @Delete('resources/:resource')
    @HttpCode(200)
    async delete(
        @Param('resource') resource: string,
        @Body('keys') keys: unknown,
        @Body('force') force: unknown,
        @Req() request: object,
    ): Promise<DeleteResponse> {
        return this.adminService.delete({
            resource,
            keys,
            force,
            actor: await this.actor({ request }),
        });
    }

    @Get('resources/:resource/:key/activity')
    recordActivity(
        @Param('resource') resource: string,
        @Param('key') key: string,
        @Query('page') page: unknown,
    ): Promise<ActivityResponse> {
        return this.adminService.recordActivity({ resource, key, page });
    }

    @Post('resources/:resource/restore')
    @HttpCode(200)
    async restore(
        @Param('resource') resource: string,
        @Body('keys') keys: unknown,
        @Req() request: object,
    ): Promise<RestoreResponse> {
        return this.adminService.restore({
            resource,
            keys,
            actor: await this.actor({ request }),
        });
    }

    @Get('resources/:resource/:key/relations/:field')
    relatedList(
        @Param('resource') resource: string,
        @Param('key') key: string,
        @Param('field') field: string,
        @Query() query: QueryParams,
    ): Promise<ListResponse> {
        return this.adminService.relatedList({ resource, key, field, query });
    }

    @Post('resources/:resource/:key/relations/:field/attach')
    @HttpCode(200)
    async attach(
        @Param('resource') resource: string,
        @Param('key') key: string,
        @Param('field') field: string,
        @Body('keys') keys: unknown,
        @Req() request: object,
    ): Promise<RelatedKeysResponse> {
        return this.adminService.link({
            resource,
            key,
            field,
            keys,
            attaching: true,
            actor: await this.actor({ request }),
        });
    }

    @Post('resources/:resource/:key/relations/:field/detach')
    @HttpCode(200)
    async detach(
        @Param('resource') resource: string,
        @Param('key') key: string,
        @Param('field') field: string,
        @Body('keys') keys: unknown,
        @Req() request: object,
    ): Promise<RelatedKeysResponse> {
        return this.adminService.link({
            resource,
            key,
            field,
            keys,
            attaching: false,
            actor: await this.actor({ request }),
        });
    }

    @Post('resources/:resource/actions/:action')
    @HttpCode(200)
    async runAction(
        @Param('resource') resource: string,
        @Param('action') action: string,
        @Body('keys') keys: unknown,
        @Body('values') values: unknown,
        @Req() request: object,
    ): Promise<ActionResponse> {
        return this.adminService.runAction({
            resource,
            action,
            keys,
            values,
            actor: await this.actor({ request }),
        });
    }
}
