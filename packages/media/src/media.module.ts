import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionWorker } from './conversion/conversion.worker.js';
import { MediaEntity } from './entities/media.entity.js';
import { MediaAttachmentEntity } from './entities/media-attachment.entity.js';
import { type MediaConfig, mediaConfig } from './media.config.js';
import { MediaService } from './media.service.js';
import { LocalStorageService } from './storage/local-storage.service.js';
import { S3StorageService } from './storage/s3-storage.service.js';
import {
    type IStorageService,
    STORAGE_SERVICE,
} from './storage/storage.interface.js';

const mediaConfigModule = ConfigModule.forFeature(mediaConfig);

@Module({
    imports: [
        mediaConfigModule,
        TypeOrmModule.forFeature([MediaEntity, MediaAttachmentEntity]),
    ],
    providers: [
        MediaService,
        ConversionWorker,
        {
            provide: STORAGE_SERVICE,
            inject: [mediaConfig.KEY],
            useFactory: (config: MediaConfig): IStorageService => {
                if (config.disk === 's3')
                    return new S3StorageService(config.s3);
                if (config.disk === 'local')
                    return new LocalStorageService(config.local);

                throw new Error(
                    `Unknown media.disk "${config.disk}", expected "local" or "s3"`,
                );
            },
        },
    ],
    exports: [MediaService, mediaConfigModule],
})
export class MediaModule {}
