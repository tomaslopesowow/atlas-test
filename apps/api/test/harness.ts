import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer as createHttpServer, type Server } from 'node:http';
import { type AddressInfo, createServer as createTcpServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { gunzipSync } from 'node:zlib';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';

/** A mail the api sent, as the SMTP sink received it. */
export interface Mail {
    to: string;
    subject: string;
    raw: string;
}

/** A push the api sent, as the Expo stub received it. */
export interface Push {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    priority?: string;
}

// biome-ignore lint/suspicious/noExplicitAny: a response body is whatever JSON the api sent, which each test reads as it expects
export type Json = any;

export interface Response<T = Json> {
    status: number;
    body: T;
    headers: Headers;
}

/** A signed-in user: their id, and the token their requests carry. */
export interface Account {
    id: number;
    email: string;
    token: string;
}

export interface RequestOptions {
    /** Who to act as, by their session token; anonymous when unset. */
    as?: Pick<Account, 'token'>;
    json?: unknown;
    form?: FormData;
    /** Raw headers, sent as they are. */
    headers?: Record<string, string>;
}

export const PASSWORD = 'correct horse battery';

/** Expo answers DeviceNotRegistered for a token containing this, as for an uninstalled app. */
export const GONE_TOKEN = 'Gone';

/** The admin account the seeder creates at boot. */
export const ADMIN_EMAIL = 'admin@atlas.test';

export const ADMIN_PASSWORD = 'admin password';

// the server the e2e databases are made on: the api's docker/compose.yml unless the environment says otherwise
const server = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'atlas',
    password: process.env.DB_PASSWORD || 'atlas',
    database: process.env.DB_DATABASE || 'atlas',
};

const listen = async (target: Server | ReturnType<typeof createTcpServer>) => {
    await new Promise<void>((resolve) =>
        target.listen(0, '127.0.0.1', resolve),
    );

    return (target.address() as AddressInfo).port;
};

const header = (raw: string, name: string) =>
    raw.match(new RegExp(`^${name}: (.*)$`, 'mi'))?.[1]?.trim() ?? '';

/** Speaks just enough SMTP for nodemailer, keeping every mail. */
const smtpSink = (mails: Mail[]) =>
    createTcpServer((socket) => {
        let reading = false;
        let raw = '';
        let buffered = '';

        socket.write('220 sink\r\n');
        socket.on('data', (chunk) => {
            buffered += chunk.toString();

            const lines = buffered.split('\r\n');
            buffered = lines.pop() ?? '';

            for (const line of lines) {
                if (reading) {
                    if (line === '.') {
                        reading = false;
                        mails.push({
                            to: header(raw, 'To'),
                            subject: header(raw, 'Subject'),
                            raw,
                        });
                        raw = '';
                        socket.write('250 queued\r\n');
                    } else raw += `${line}\n`;
                    continue;
                }

                const command = line.slice(0, 4).toUpperCase();

                if (command === 'EHLO') socket.write('250-sink\r\n250 OK\r\n');
                else if (command === 'DATA') {
                    reading = true;
                    socket.write('354 go on\r\n');
                } else if (command === 'QUIT') socket.end('221 bye\r\n');
                else if (line) socket.write('250 OK\r\n');
            }
        });
        socket.on('error', () => {});
    });

/** Expo's send endpoint, keeping every push and answering for each in order. */
const expoStub = (pushes: Push[]) =>
    createHttpServer((request, response) => {
        const chunks: Buffer[] = [];

        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => {
            const body = Buffer.concat(chunks);
            const messages: Push[] = JSON.parse(
                (request.headers['content-encoding'] === 'gzip'
                    ? gunzipSync(body)
                    : body
                ).toString(),
            );

            pushes.push(...messages);
            response.setHeader('content-type', 'application/json');
            response.end(
                JSON.stringify({
                    data: messages.map(({ to }) =>
                        to.includes(GONE_TOKEN)
                            ? {
                                  status: 'error',
                                  message: `"${to}" is not a registered push notification recipient`,
                                  details: { error: 'DeviceNotRegistered' },
                              }
                            : { status: 'ok', id: randomUUID() },
                    ),
                }),
            );
        });
    });

/** Polls until `check` returns something truthy, failing with its last error after `timeout` ms. */
export const eventually = async <T>(
    check: () => Promise<T> | T,
    timeout = 10_000,
): Promise<NonNullable<T>> => {
    const deadline = Date.now() + timeout;
    let last: unknown;

    while (Date.now() < deadline) {
        try {
            const result = await check();

            if (result) return result;
        } catch (error) {
            last = error;
        }

        await sleep(50);
    }

    throw last ?? new Error(`Gave up after ${timeout} ms`);
};

/** A 1x1 png, which every conversion can resize. */
export const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
);

/** A multipart body with the file in `file`, and any other fields. */
export const fileForm = (
    file: { content: Buffer | string; type: string; name?: string } | undefined,
    fields: Record<string, string> = {},
): FormData => {
    const form = new FormData();

    if (file)
        form.append(
            'file',
            new Blob([new Uint8Array(Buffer.from(file.content))], {
                type: file.type,
            }),
            file.name ?? 'upload.png',
        );

    for (const [name, value] of Object.entries(fields))
        form.append(name, value);

    return form;
};

/**
 * The real AppModule, set up as main.ts does, on a database of its own that is dropped afterwards,
 * mailing an SMTP sink and pushing to an Expo stub. Run one per test file.
 */
export const startHarness = async () => {
    const mails: Mail[] = [];
    const pushes: Push[] = [];
    const sink = smtpSink(mails);
    const expo = expoStub(pushes);
    const database = `atlas_e2e_${randomUUID().replaceAll('-', '')}`;
    const uploads = await mkdtemp(join(tmpdir(), 'atlas-e2e-'));
    const admin = new DataSource(server);

    await admin.initialize();
    await admin.query(`CREATE DATABASE "${database}"`);

    Object.assign(process.env, {
        ADMIN_EMAIL,
        ADMIN_PASSWORD,
        DB_HOST: server.host,
        DB_PORT: String(server.port),
        DB_USERNAME: server.username,
        DB_PASSWORD: server.password,
        DB_DATABASE: database,
        STORAGE_DISK: 'local',
        STORAGE_LOCAL_PATH: uploads,
        STORAGE_MAX_FILE_SIZE: String(100 * 1024),
        STORAGE_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,image/webp',
        NOTIFICATIONS_MAIL_PROVIDER: 'smtp',
        MAIL_FROM: 'Atlas <hello@atlas.test>',
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: String(await listen(sink)),
        NOTIFICATIONS_PUSH_PROVIDERS: 'expo',
        // read by expo-server-sdk when it loads, so before the app is imported
        EXPO_BASE_URL: `http://127.0.0.1:${await listen(expo)}`,
    });

    // far from the database's UTC, so a date column that loses its time zone is hours off, and a test sees it
    process.env.TZ = 'Pacific/Kiritimati';

    // imported here, after the environment above, rather than at the top of the file
    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../src/app.module.js');
    const { setUpApp } = await import('../src/app.setup.js');

    let app: NestExpressApplication;
    let url = '';

    const boot = async () => {
        app = await NestFactory.create<NestExpressApplication>(AppModule, {
            logger: ['error', 'warn'],
        });
        setUpApp(app);
        await app.listen(0, '127.0.0.1');
        url = await app.getUrl();
    };

    const request = async <T = Json>(
        method: string,
        path: string,
        { as, json, form, headers: raw = {} }: RequestOptions = {},
    ): Promise<Response<T>> => {
        const headers: Record<string, string> = { ...raw };

        if (as) headers.authorization = `Bearer ${as.token}`;
        if (json !== undefined) headers['content-type'] = 'application/json';

        const response = await fetch(url + path, {
            method,
            headers,
            body: json !== undefined ? JSON.stringify(json) : form,
        });
        const text = await response.text();
        let body: T;

        try {
            body = text ? JSON.parse(text) : undefined;
        } catch {
            body = text as T;
        }

        return { status: response.status, body, headers: response.headers };
    };

    await boot();

    return {
        mails,
        pushes,
        get app() {
            return app;
        },
        get url() {
            return url;
        },
        request,
        get: <T = Json>(path: string, options?: RequestOptions) =>
            request<T>('GET', path, options),
        post: <T = Json>(path: string, options?: RequestOptions) =>
            request<T>('POST', path, options),
        put: <T = Json>(path: string, options?: RequestOptions) =>
            request<T>('PUT', path, options),
        patch: <T = Json>(path: string, options?: RequestOptions) =>
            request<T>('PATCH', path, options),
        delete: <T = Json>(path: string, options?: RequestOptions) =>
            request<T>('DELETE', path, options),

        /** Raw SQL on the test database, for what the api does not show. */
        query: <T = Json>(sql: string, parameters?: unknown[]): Promise<T[]> =>
            app.get(DataSource).query(sql, parameters),

        /** Stops the app and boots a new one on the same database, as a deploy would. */
        restart: async () => {
            await app.close();
            await boot();
        },

        /** Registers a user, resolving with their id and token. */
        signUp: async (
            email: string,
            name = email.split('@')[0] ?? email,
        ): Promise<Account> => {
            const { status, body } = await request('POST', '/auth/register', {
                json: { email, password: PASSWORD, name },
            });

            if (status !== 201)
                throw new Error(
                    `Sign up failed: ${status} ${JSON.stringify(body)}`,
                );

            return {
                id: body.user.id,
                email: body.user.email,
                token: body.token,
            };
        },

        /** Signs a registered user in, resolving with their id and a new token. */
        signIn: async (
            email: string,
            password = PASSWORD,
        ): Promise<Account> => {
            const { status, body } = await request('POST', '/auth/login', {
                json: { email, password },
            });

            if (status !== 200)
                throw new Error(
                    `Sign in failed: ${status} ${JSON.stringify(body)}`,
                );

            return {
                id: body.user.id,
                email: body.user.email,
                token: body.token,
            };
        },

        close: async () => {
            await app.close();
            await new Promise((resolve) => sink.close(resolve));
            await new Promise((resolve) => expo.close(resolve));
            await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
            await admin.destroy();
            await rm(uploads, { recursive: true, force: true });
        },
    };
};

export type Harness = Awaited<ReturnType<typeof startHarness>>;
