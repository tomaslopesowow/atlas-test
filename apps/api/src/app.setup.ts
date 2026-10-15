import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { serveLocalMedia } from '@repo/media';
import { DataSource } from 'typeorm';
import { migrate } from './config/data-source.js';

/** What main.ts does to the app before it listens, shared with the e2e tests. */
export const setUpApp = async (app: NestExpressApplication): Promise<void> => {
    // before anything the app runs on boot reads the tables, as the seeders and workers do
    await migrate(app.get(DataSource));

    app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
    );

    // so the media and notification workers stop, and the mail pool closes, on SIGTERM
    app.enableShutdownHooks();

    serveLocalMedia(app);
};
