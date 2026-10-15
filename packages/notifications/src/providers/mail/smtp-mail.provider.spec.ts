import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import nodemailer from 'nodemailer';
import { UndeliverableError } from '../../delivery/undeliverable.error.js';
import type { NotificationsConfig } from '../../notifications.config.js';
import type { MailMessage } from '../../types/types.js';
import { SmtpMailProvider } from './smtp-mail.provider.js';

type SmtpConfig = NotificationsConfig['mail']['smtp'];

const smtp: SmtpConfig = {
    host: 'smtp.atlas.test',
    port: 587,
    user: 'atlas',
    password: 'secret',
};

const mail: MailMessage = {
    from: 'Atlas <noreply@atlas.test>',
    to: 'ada@example.test',
    subject: 'Invoice paid',
    html: '<p>Invoice paid</p>',
    text: 'Invoice paid',
};

const aProvider = (overrides: Partial<SmtpConfig> = {}) =>
    new SmtpMailProvider({
        mail: { smtp: { ...smtp, ...overrides } },
    } as NotificationsConfig);

/** What nodemailer rejects with: the server's reply code, when there was one, and its own error code. */
const smtpError = (fields: { code?: string; responseCode?: number }) =>
    Object.assign(new Error('Recipient command failed'), fields);

let sendMail: ReturnType<typeof fakeSendMail>;
const close = mock.fn((): void => {});
let createTransport: ReturnType<typeof fakeCreateTransport>;

const fakeSendMail = () =>
    mock.fn(async (_options: unknown): Promise<unknown> => ({}));

// the provider builds its transporter through nodemailer's exports, so no connection is ever opened
const fakeCreateTransport = () =>
    mock.method(nodemailer, 'createTransport', (_options: unknown) => ({
        sendMail,
        close,
    }));

const failWith = (error: Error) =>
    sendMail.mock.mockImplementation(async () => {
        throw error;
    });

const transportOptions = () =>
    createTransport.mock.calls.at(-1)?.arguments[0] as
        | Record<string, unknown>
        | undefined;

beforeEach(() => {
    sendMail = fakeSendMail();
    close.mock.resetCalls();
    createTransport = fakeCreateTransport();
});

afterEach(() => mock.restoreAll());

describe('SmtpMailProvider transporter', () => {
    it('connects to the configured host and port, logging in with the user and password', async () => {
        await aProvider().send({ mail });

        assert.partialDeepStrictEqual(transportOptions(), {
            pool: true,
            host: 'smtp.atlas.test',
            port: 587,
            secure: false,
            auth: { user: 'atlas', pass: 'secret' },
        });
    });

    it('requires STARTTLS once it logs in, so the credentials never cross in the clear', async () => {
        await aProvider().send({ mail });

        assert.equal(transportOptions()?.requireTLS, true);
    });

    it('requires no TLS without credentials, as the Mailpit of development offers none', async () => {
        await aProvider({ user: undefined, password: undefined }).send({
            mail,
        });

        assert.equal(transportOptions()?.requireTLS, false);
    });

    it('gives up on a silent server within a minute, rather than the 10 nodemailer would wait', async () => {
        await aProvider().send({ mail });

        assert.partialDeepStrictEqual(transportOptions(), {
            connectionTimeout: 30_000,
            greetingTimeout: 30_000,
            socketTimeout: 60_000,
        });
    });

    it('closes its pooled connections once the app has shut down, which would hold the process up', async () => {
        const provider = aProvider();
        await provider.send({ mail });

        provider.onApplicationShutdown();

        assert.equal(close.mock.callCount(), 1);
    });

    it('keeps its connections through module shutdown, while the worker sends its last batch', async () => {
        const provider = aProvider();
        await provider.send({ mail });

        assert.equal('onModuleDestroy' in provider, false);
    });

    it('shuts down without a transporter it never needed', () => {
        assert.doesNotThrow(() => aProvider().onApplicationShutdown());
        assert.equal(close.mock.callCount(), 0);
    });

    it('uses implicit TLS on port 465 only', async () => {
        await aProvider({ port: 465 }).send({ mail });

        assert.equal(transportOptions()?.secure, true);
    });

    it('does not log in without a user', async () => {
        await aProvider({ user: undefined, password: undefined }).send({
            mail,
        });

        assert.equal(transportOptions()?.auth, undefined);
    });

    it('reuses the one transporter', async () => {
        const provider = aProvider();

        await provider.send({ mail });
        await provider.send({ mail });

        assert.equal(createTransport.mock.callCount(), 1);
        assert.equal(sendMail.mock.callCount(), 2);
    });

    it('refuses to send without a host, as SMTP is used but not configured', async () => {
        await assert.rejects(
            aProvider({ host: undefined }).send({ mail }),
            UndeliverableError,
        );
        assert.equal(createTransport.mock.callCount(), 0);
    });
});

describe('SmtpMailProvider.send', () => {
    it('sends the mail as rendered', async () => {
        await aProvider().send({ mail });

        assert.deepEqual(sendMail.mock.calls[0]?.arguments, [mail]);
    });

    it('refuses for good on a 5xx or an envelope error, keeping the cause', async () => {
        for (const error of [
            smtpError({ code: 'EENVELOPE', responseCode: 550 }),
            smtpError({ code: 'EMESSAGE', responseCode: 552 }),
            smtpError({ code: 'EENVELOPE' }),
        ]) {
            failWith(error);

            await assert.rejects(
                aProvider().send({ mail }),
                (thrown) =>
                    thrown instanceof UndeliverableError &&
                    thrown.cause === error,
                JSON.stringify(error),
            );
        }
    });

    it('rethrows a 4xx or a connection error as is, so the worker retries it', async () => {
        for (const error of [
            smtpError({ code: 'EENVELOPE', responseCode: 450 }),
            smtpError({ responseCode: 421 }),
            smtpError({ code: 'ECONNECTION' }),
            smtpError({ code: 'ETIMEDOUT' }),
        ]) {
            failWith(error);

            await assert.rejects(
                aProvider().send({ mail }),
                (thrown) => thrown === error,
                JSON.stringify(error),
            );
        }
    });
});
