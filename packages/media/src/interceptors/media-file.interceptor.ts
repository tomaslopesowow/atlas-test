import {
    type CallHandler,
    type ExecutionContext,
    Inject,
    Injectable,
    mixin,
    type NestInterceptor,
    PayloadTooLargeException,
    type Type,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type MediaConfig, mediaConfig } from '../media.config.js';
import { normalizeMimeType } from '../utils.js';

const KB = 1024;
const MB = 1024 * KB;

function formatSize(bytes: number): string {
    if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;

    return bytes >= KB ? `${(bytes / KB).toFixed(1)} KB` : `${bytes} bytes`;
}

/**
 * `FileInterceptor` with media's limits, enforced while the upload streams in:
 * a wrong type is refused from the part's headers, a file too large as soon as it passes the limit.
 */
export function MediaFileInterceptor(fieldName: string): Type<NestInterceptor> {
    @Injectable()
    class Interceptor implements NestInterceptor {
        private readonly upload: NestInterceptor;
        private readonly tooLarge: string;

        constructor(
            @Inject(mediaConfig.KEY)
            {
                maxFileSize,
                allowedMimeTypes,
            }: Pick<MediaConfig, 'maxFileSize' | 'allowedMimeTypes'>,
        ) {
            this.tooLarge = `The file must be at most ${formatSize(maxFileSize)}`;

            // no app-wide multer options: the service reads the file from memory, wherever multer would store it
            const Upload = FileInterceptor(fieldName, {
                limits: { fileSize: maxFileSize },
                fileFilter: (_request, { mimetype }, accept) =>
                    allowedMimeTypes.includes(normalizeMimeType(mimetype))
                        ? accept(null, true)
                        : accept(
                              new UnsupportedMediaTypeException(
                                  `The file must be one of ${allowedMimeTypes.join(', ')}`,
                              ),
                              false,
                          ),
            });

            this.upload = new Upload();
        }

        async intercept(context: ExecutionContext, next: CallHandler) {
            try {
                return await this.upload.intercept(context, next);
            } catch (error) {
                // multer's own message names no limit
                if (error instanceof PayloadTooLargeException)
                    throw new PayloadTooLargeException(this.tooLarge);

                throw error;
            }
        }
    }

    return mixin(Interceptor);
}
