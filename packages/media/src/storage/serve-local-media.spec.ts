import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { LocalStorageService } from './local-storage.service.js';
import { serveLocalMedia } from './serve-local-media.js';
import { STORAGE_SERVICE } from './storage.interface.js';

const anApp = (storage: object) => {
    const app = {
        get: mock.fn((_token: unknown, _options: unknown) => storage),
        useStaticAssets: mock.fn((_root: string, _options: unknown) => app),
    };

    return app;
};

describe('serveLocalMedia', () => {
    it('serves the local root at the prefix its urls start with', () => {
        const storage = new LocalStorageService({ path: '/srv/uploads' });
        const app = anApp(storage);

        serveLocalMedia(app as unknown as NestExpressApplication);

        assert.deepEqual(app.get.mock.calls[0]?.arguments, [
            STORAGE_SERVICE,
            { strict: false },
        ]);
        const [root, options] = app.useStaticAssets.mock.calls[0]
            ?.arguments as [string, { prefix: string }];

        assert.equal(root, storage.root);
        assert.equal(options.prefix, '/uploads');
    });

    it('tells browsers to read a file only as the type it is served as, and to run no script in it', () => {
        const app = anApp(new LocalStorageService({ path: '/srv/uploads' }));
        const response = { setHeader: mock.fn() };

        serveLocalMedia(app as unknown as NestExpressApplication);

        const [, { setHeaders }] = app.useStaticAssets.mock.calls[0]
            ?.arguments as [string, { setHeaders: (res: object) => void }];
        setHeaders(response);

        assert.deepEqual(
            Object.fromEntries(
                response.setHeader.mock.calls.map((call) => call.arguments),
            ),
            {
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy':
                    "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            },
        );
    });

    it('serves nothing for storage that serves its own files', () => {
        const app = anApp({ disk: 's3' });

        serveLocalMedia(app as unknown as NestExpressApplication);

        assert.equal(app.useStaticAssets.mock.callCount(), 0);
    });
});
