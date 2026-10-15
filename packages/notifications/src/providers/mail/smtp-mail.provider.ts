import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { MailProvider } from '../../decorators/notifications.decorators.js';
import { UndeliverableError } from '../../delivery/undeliverable.error.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../../notifications.config.js';
import type { MailSendInput } from '../../types/types.js';
import type { IMailProvider } from './mail-provider.interface.js';

// a 4xx asks to try later even when it rejects the envelope, as greylisting does
const isPermanent = (error: unknown): boolean => {
    const { code, responseCode }: { code?: string; responseCode?: number } =
        Object(error);

    return responseCode ? responseCode >= 500 : code === 'EENVELOPE';
};

// nodemailer's own wait up to 10 minutes on a silent server, holding the whole batch that long
const CONNECTION_TIMEOUT_MS = 30_000;
const SOCKET_TIMEOUT_MS = 60_000;

@Injectable()
@MailProvider('smtp')
export class SmtpMailProvider implements IMailProvider, OnApplicationShutdown {
    private transporter?: Transporter;

    constructor(
        @Inject(notificationsConfig.KEY)
        private readonly config: NotificationsConfig,
    ) {}

    // the pool keeps its connections open, which would hold the process up; closed only once the
    // delivery worker has stopped, as module shutdown hooks run side by side and would cut its mails off
    onApplicationShutdown(): void {
        this.transporter?.close();
    }

    /** Sends one mail, throwing an `UndeliverableError` when the server refuses it for good. */
    async send({
        mail: { from, to, subject, html, text },
    }: MailSendInput): Promise<void> {
        const transporter = this.transport();

        try {
            await transporter.sendMail({ from, to, subject, html, text });
        } catch (error) {
            if (isPermanent(error))
                throw new UndeliverableError(
                    `SMTP refused the mail: ${(error as Error).message}`,
                    { cause: error },
                );

            throw error;
        }
    }

    // on first use, so an app on another mail provider needs no SMTP settings
    private transport(): Transporter {
        if (this.transporter) return this.transporter;

        const { host, port, user, password } = this.config.mail.smtp;

        if (!host)
            throw new UndeliverableError(
                'SMTP is used, but SMTP_HOST is unset',
            );

        // 465 is implicit TLS; other ports upgrade with STARTTLS, required once there are credentials to protect.
        // Pooled, so a mail reuses a connection rather than opening one, with its TLS handshake
        this.transporter = nodemailer.createTransport({
            pool: true,
            host,
            port,
            secure: port === 465,
            requireTLS: Boolean(user),
            auth: user ? { user, pass: password } : undefined,
            connectionTimeout: CONNECTION_TIMEOUT_MS,
            greetingTimeout: CONNECTION_TIMEOUT_MS,
            socketTimeout: SOCKET_TIMEOUT_MS,
        });

        return this.transporter;
    }
}
