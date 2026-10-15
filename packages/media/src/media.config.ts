import { ObjectCannedACL } from '@aws-sdk/client-s3';
import { applyDecorators } from '@nestjs/common';
import { type ConfigType, registerAs } from '@nestjs/config';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
    validateSync,
} from 'class-validator';
import { normalizeMimeType } from './utils.js';

const RequiredOnS3 = () =>
    applyDecorators(
        ValidateIf((env: MediaEnv) => env.STORAGE_DISK === 's3'),
        IsString(),
        IsNotEmpty(),
    );

/** The variables media reads, 1:1 with `.env`; the initialisers are the defaults. */
export class MediaEnv {
    @IsIn(['local', 's3'])
    STORAGE_DISK: 'local' | 's3' = 'local';

    @IsString()
    @IsNotEmpty()
    STORAGE_LOCAL_PATH = './uploads';

    @Type(() => Number)
    @IsInt()
    @Min(1)
    STORAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;

    // a decoded image takes about 4 bytes a pixel, which a small compressed file can hide
    @Type(() => Number)
    @IsInt()
    @Min(1)
    STORAGE_MAX_IMAGE_PIXELS = 50_000_000;

    // normalised as the pipe normalises an upload's type, so the two compare equal
    @Transform(({ value }) =>
        typeof value === 'string'
            ? value.split(',').map(normalizeMimeType).filter(Boolean)
            : value,
    )
    @IsString({ each: true })
    @ArrayNotEmpty()
    STORAGE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    @RequiredOnS3()
    S3_BUCKET?: string;

    @RequiredOnS3()
    S3_ENDPOINT?: string;

    @RequiredOnS3()
    S3_ACCESS_KEY_ID?: string;

    @RequiredOnS3()
    S3_SECRET_ACCESS_KEY?: string;

    @RequiredOnS3()
    S3_REGION?: string;

    @IsString()
    @IsOptional()
    S3_CDN_URL?: string;

    // unset sends none and leaves access to the bucket policy, since new AWS buckets refuse ACLs
    @ValidateIf(({ S3_ACL }: MediaEnv) => Boolean(S3_ACL))
    @IsIn(Object.values(ObjectCannedACL))
    S3_ACL?: ObjectCannedACL;
}

/** Validates the environment, so a missing or mistyped variable stops the app at boot. */
export const mediaConfig = registerAs(
    'media',
    (source: Record<string, string | undefined> = process.env) => {
        const env = plainToInstance(MediaEnv, source);
        const errors = validateSync(env);

        // every problem at once, rather than one per boot
        if (errors.length)
            throw new Error(
                `Invalid media environment:\n${errors
                    .flatMap(({ constraints }) =>
                        Object.values(constraints ?? {}),
                    )
                    .map((problem) => `  ${problem}`)
                    .join('\n')}`,
            );

        return {
            disk: env.STORAGE_DISK,
            maxFileSize: env.STORAGE_MAX_FILE_SIZE,
            maxImagePixels: env.STORAGE_MAX_IMAGE_PIXELS,
            allowedMimeTypes: env.STORAGE_ALLOWED_MIME_TYPES,

            local: {
                path: env.STORAGE_LOCAL_PATH,
            },

            s3: {
                bucket: env.S3_BUCKET,
                endpoint: env.S3_ENDPOINT,
                key: env.S3_ACCESS_KEY_ID,
                secret: env.S3_SECRET_ACCESS_KEY,
                region: env.S3_REGION,
                cdnUrl: env.S3_CDN_URL,
                // an unset env var arrives as ''
                acl: env.S3_ACL || undefined,
            },
        };
    },
);

export type MediaConfig = ConfigType<typeof mediaConfig>;
