import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
    type IStorageService,
    LocalStorageService,
    STORAGE_SERVICE,
} from '@repo/media';

/** What main.ts does to the app before it listens, shared with the e2e tests. */
export const setUpApp = (app: NestExpressApplication): void => {
    const storage = app.get<IStorageService>(STORAGE_SERVICE);

    app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
    );

    // so the media and notification workers stop, and the mail pool closes, on SIGTERM
    app.enableShutdownHooks();

    // S3 serves its own files, so only local storage needs a route
    if (storage instanceof LocalStorageService)
        app.useStaticAssets(storage.root, { prefix: storage.urlPrefix });
};
