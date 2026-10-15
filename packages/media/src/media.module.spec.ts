import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
    Controller,
    Injectable,
    Module,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaEntity } from './entities/media.entity.js';
import { MediaAttachmentEntity } from './entities/media-attachment.entity.js';
import { MediaFileInterceptor } from './interceptors/media-file.interceptor.js';
import { type MediaConfig, mediaConfig } from './media.config.js';
import { MediaModule } from './media.module.js';
import { MediaService } from './media.service.js';
import { LocalStorageService } from './storage/local-storage.service.js';
import { S3StorageService } from './storage/s3-storage.service.js';
import { STORAGE_SERVICE } from './storage/storage.interface.js';

@Injectable()
class Uploads {
    constructor(readonly media: MediaService) {}
}

@Controller('uploads')
class UploadsController {
    @Post()
    @UseInterceptors(MediaFileInterceptor('file'))
    upload(@UploadedFile() file: Express.Multer.File) {
        return file;
    }
}

@Module({
    imports: [MediaModule],
    controllers: [UploadsController],
    providers: [Uploads],
})
class UploadsModule {}

const aConfig = (disk: string) =>
    ({
        disk,
        maxFileSize: 1024,
        maxImagePixels: 1_000_000,
        allowedMimeTypes: ['image/png'],
        local: { path: './uploads' },
        s3: {
            region: 'ams3',
            endpoint: 'https://ams3.digitaloceanspaces.com',
            bucket: 'atlas-media',
            key: 'access-key',
            secret: 'secret-key',
        },
    }) as MediaConfig;

/** The app's side of the contract is only a database; without a config, media reads the environment. */
// each compile resolves Uploads and the interceptor, so every test also checks what MediaModule exports
const compile = (config?: MediaConfig) => {
    const builder = Test.createTestingModule({ imports: [UploadsModule] })
        .overrideProvider(getRepositoryToken(MediaEntity))
        .useValue({})
        .overrideProvider(getRepositoryToken(MediaAttachmentEntity))
        .useValue({});

    return (
        config
            ? builder.overrideProvider(mediaConfig.KEY).useValue(config)
            : builder
    ).compile();
};

const withEnv = async (
    vars: Record<string, string>,
    run: () => Promise<unknown>,
) => {
    Object.assign(process.env, vars);

    try {
        await run();
    } finally {
        for (const name of Object.keys(vars)) delete process.env[name];
    }
};

describe('MediaModule', () => {
    it('stores files on the local disk when told to', async () => {
        const module = await compile(aConfig('local'));

        assert.ok(module.get(STORAGE_SERVICE) instanceof LocalStorageService);
    });

    it('stores files in S3 when told to', async () => {
        const module = await compile(aConfig('s3'));

        assert.ok(module.get(STORAGE_SERVICE) instanceof S3StorageService);
    });

    it('refuses a disk it does not know rather than storing locally', async () => {
        await assert.rejects(
            compile(aConfig('S3')),
            /Unknown media\.disk "S3", expected "local" or "s3"/,
        );
    });

    it('configures itself from the environment, with nothing loaded by the app', () =>
        withEnv({ STORAGE_LOCAL_PATH: './from-env' }, async () => {
            const storage = (await compile()).get<LocalStorageService>(
                STORAGE_SERVICE,
            );

            assert.equal(storage.root, resolve('./from-env'));
        }));

    it('refuses to start on an invalid environment', () =>
        withEnv({ STORAGE_DISK: 'ftp' }, () =>
            assert.rejects(compile(), /Invalid media environment/),
        ));
});
