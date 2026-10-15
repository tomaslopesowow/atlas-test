import type { NestExpressApplication } from '@nestjs/platform-express';
import { LocalStorageService } from './local-storage.service.js';
import { type IStorageService, STORAGE_SERVICE } from './storage.interface.js';

/** Serves the local disk's files at the urls media hands out; S3 serves its own, so then it does nothing. Call it in main.ts. */
export const serveLocalMedia = (app: NestExpressApplication): void => {
    const storage = app.get<IStorageService>(STORAGE_SERVICE, {
        strict: false,
    });

    if (storage instanceof LocalStorageService)
        app.useStaticAssets(storage.root, {
            prefix: storage.urlPrefix,
            // served as the type its extension names, sandboxed so an svg runs no script on the app's origin
            setHeaders: (response) => {
                response.setHeader('X-Content-Type-Options', 'nosniff');
                response.setHeader(
                    'Content-Security-Policy',
                    "default-src 'none'; style-src 'unsafe-inline'; sandbox",
                );
            },
        });
};
