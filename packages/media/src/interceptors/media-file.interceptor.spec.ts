import assert from 'node:assert/strict';
import { request } from 'node:http';
import { after, before, describe, it } from 'node:test';
import {
    Controller,
    type INestApplication,
    Module,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mediaConfig } from '../media.config.js';
import { MediaFileInterceptor } from './media-file.interceptor.js';

const LIMIT = 1024;
const BOUNDARY = 'atlas-boundary';

@Controller('uploads')
class UploadsController {
    @Post()
    @UseInterceptors(MediaFileInterceptor('file'))
    upload(@UploadedFile() file: Express.Multer.File) {
        return { size: file.buffer.length, mimetype: file.mimetype };
    }
}

@Module({
    imports: [ConfigModule.forFeature(mediaConfig)],
    controllers: [UploadsController],
})
class UploadsModule {}

let app: INestApplication;
let url: string;

before(async () => {
    const module = await Test.createTestingModule({ imports: [UploadsModule] })
        .overrideProvider(mediaConfig.KEY)
        .useValue({ maxFileSize: LIMIT, allowedMimeTypes: ['image/png'] })
        .compile();

    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/uploads`;
});

after(() => app.close());

const upload = async (bytes: number, type = 'image/png') => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.alloc(bytes)], { type }), 'a.png');

    const response = await fetch(url, { method: 'POST', body: form });

    return {
        status: response.status,
        body: (await response.json()) as { message?: string },
    };
};

/** A multipart upload with a part header as given, which fetch would normalise. */
const rawUpload = ({ type, bytes }: { type: string; bytes: number }) =>
    new Promise<{ status?: number; body: { message?: string } }>(
        (resolve, reject) => {
            const sending = request(
                url,
                {
                    method: 'POST',
                    headers: {
                        'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
                    },
                },
                (response) => {
                    let body = '';

                    response
                        .setEncoding('utf8')
                        .on('data', (chunk) => {
                            body += chunk;
                        })
                        .on('end', () =>
                            resolve({
                                status: response.statusCode,
                                body: JSON.parse(body),
                            }),
                        );
                },
            );

            sending.on('error', reject);
            sending.write(
                `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: ${type}\r\n\r\n`,
            );
            sending.write(Buffer.alloc(bytes));
            sending.end(`\r\n--${BOUNDARY}--\r\n`);
        },
    );

describe('MediaFileInterceptor', () => {
    it('passes a file of an allowed type up to the limit', async () => {
        assert.deepEqual(await upload(LIMIT), {
            status: 201,
            body: { size: LIMIT, mimetype: 'image/png' },
        });
    });

    it('refuses a file one byte over the limit with 413, naming the limit', async () => {
        const { status, body } = await upload(LIMIT + 1);

        assert.equal(status, 413);
        assert.equal(body.message, 'The file must be at most 1.0 KB');
    });

    it('refuses a type outside the allow-list with 415', async () => {
        const { status, body } = await upload(10, 'image/gif');

        assert.equal(status, 415);
        assert.equal(body.message, 'The file must be one of image/png');
    });

    it('refuses a file many times the limit, which arrives in many chunks', async () => {
        const { status } = await upload(5 * 1024 * 1024);

        assert.equal(status, 413);
    });

    it('reads the type regardless of case and parameters', async () => {
        for (const type of ['IMAGE/PNG', 'image/png; charset=binary'])
            assert.equal(
                (await rawUpload({ type, bytes: 10 })).status,
                201,
                type,
            );
    });
});
