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
        return {
            size: file.buffer.length,
            mimetype: file.mimetype,
            name: file.originalname,
        };
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

const upload = async (
    bytes: number,
    type = 'image/png',
    fields: Record<string, string> = {},
) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields))
        form.append(name, value);
    form.append('file', new Blob([Buffer.alloc(bytes)], { type }), 'a.png');

    const response = await fetch(url, { method: 'POST', body: form });

    return {
        status: response.status,
        body: (await response.json()) as { message?: string },
    };
};

/** A multipart upload with a part header as given, which fetch would normalise. */
const rawUpload = ({
    type,
    bytes,
    filename = 'a.png',
}: {
    type: string;
    bytes: number;
    filename?: string;
}) =>
    new Promise<{
        status?: number;
        body: { message?: string; name?: string };
    }>((resolve, reject) => {
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
            `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`,
        );
        sending.write(Buffer.alloc(bytes));
        sending.end(`\r\n--${BOUNDARY}--\r\n`);
    });

describe('MediaFileInterceptor', () => {
    it('passes a file of an allowed type up to the limit', async () => {
        assert.deepEqual(await upload(LIMIT), {
            status: 201,
            body: { size: LIMIT, mimetype: 'image/png', name: 'a.png' },
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

    it('reads the file name as the UTF-8 a browser sends it in', async () => {
        const { body } = await rawUpload({
            type: 'image/png',
            bytes: 10,
            filename: 'café 写真.png',
        });

        assert.equal(body.name, 'café 写真.png');
    });

    it('refuses more than 20 fields with 400, since each is held in memory', async () => {
        const fields = (count: number) =>
            Object.fromEntries(
                Array.from({ length: count }, (_, i) => [`field${i}`, 'x']),
            );

        assert.equal((await upload(10, 'image/png', fields(20))).status, 201);
        assert.equal((await upload(10, 'image/png', fields(21))).status, 400);
    });

    it('refuses a field over 64 KB with 400', async () => {
        const { status } = await upload(10, 'image/png', {
            note: 'x'.repeat(64 * 1024 + 1),
        });

        assert.equal(status, 400);
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
