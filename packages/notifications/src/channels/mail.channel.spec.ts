import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { UndeliverableError } from '../delivery/undeliverable.error.js';
import type { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import { Notification, type ToMail } from '../notification.js';
import type { NotificationsConfig } from '../notifications.config.js';
import type { IMailProvider } from '../providers/mail/mail-provider.interface.js';
import {
    type Delivery,
    DeliveryStatus,
    type MailContent,
    type MailMessage,
    type MailSendInput,
    type RenderInput,
} from '../types/types.js';
import { MailChannel } from './mail.channel.js';

type Paid = { amount: number };

class InvoicePaid extends Notification<Paid> implements ToMail<Paid> {
    readonly type = 'invoice.paid';
    readonly channels = ['mail'];

    async toMail({ payload }: RenderInput<Paid>): Promise<MailContent> {
        return {
            subject: 'Invoice paid',
            html: `<p>${payload.amount}</p>`,
            text: `${payload.amount}`,
        };
    }
}

class InvoiceVoided extends Notification<Paid> {
    readonly type = 'invoice.voided';
    readonly channels = ['mail'];
}

const id = '01926d3a-7c1e-7cc2-a0a9-3b6f1c2d4e5f';
const from = 'Atlas <noreply@atlas.test>';
const ada = { modelType: 'user', modelId: 5, email: 'ada@example.test' };

const aMail = (to: string): MailMessage => ({
    from,
    to,
    subject: 'Invoice paid',
    html: '<p>5</p>',
    text: '5',
});

const aDelivery = (to: string): Delivery<MailMessage> => ({
    notificationId: id,
    message: aMail(to),
});

const provider = {
    send: mock.fn(async (_input: MailSendInput): Promise<void> => {}),
};

const explorer = {
    mailProvider: mock.fn((): IMailProvider | undefined => provider),
};

let channel: MailChannel;

beforeEach(() => {
    for (const fn of [provider.send, explorer.mailProvider]) {
        fn.mock.restore();
        fn.mock.resetCalls();
    }

    channel = new MailChannel(
        explorer as unknown as NotificationsExplorer,
        { mail: { from } } as NotificationsConfig,
    );
});

describe('MailChannel.render', () => {
    it('renders the mail with toMail(), addressed to the recipient from the configured sender', async () => {
        assert.deepEqual(
            await channel.render({
                notification: new InvoicePaid({ amount: 5 }),
                id,
                recipient: ada,
                locale: 'nl',
            }),
            aMail('ada@example.test'),
        );
    });

    it('gives toMail() the id, the recipient, the payload and the locale', async () => {
        const notification = new InvoicePaid({ amount: 5 });
        const toMail = mock.method(notification, 'toMail');

        await channel.render({
            notification,
            id,
            recipient: ada,
            locale: 'nl',
        });

        assert.deepEqual(toMail.mock.calls[0]?.arguments, [
            { id, recipient: ada, payload: { amount: 5 }, locale: 'nl' },
        ]);
    });

    it('renders a mail with only an html or only a text body', async () => {
        for (const body of [{ html: '<p>5</p>' }, { text: '5' }]) {
            const notification = new InvoicePaid({ amount: 5 });

            mock.method(notification, 'toMail', async () => ({
                subject: 'Invoice paid',
                ...body,
            }));

            assert.deepEqual(
                await channel.render({
                    notification,
                    id,
                    recipient: ada,
                    locale: 'nl',
                }),
                {
                    from,
                    to: 'ada@example.test',
                    subject: 'Invoice paid',
                    ...body,
                },
            );
        }
    });

    it('refuses a mail with neither an html nor a text body', async () => {
        for (const body of [{}, { html: '', text: '' }]) {
            const notification = new InvoicePaid({ amount: 5 });

            mock.method(
                notification,
                'toMail',
                async () =>
                    ({ subject: 'Invoice paid', ...body }) as MailContent,
            );

            await assert.rejects(
                channel.render({
                    notification,
                    id,
                    recipient: ada,
                    locale: 'nl',
                }),
                new TypeError(
                    '"invoice.paid" rendered a mail with neither html nor text',
                ),
            );
        }
    });

    it('skips a recipient without an email', async () => {
        const notification = new InvoicePaid({ amount: 5 });
        const toMail = mock.method(notification, 'toMail');

        assert.equal(
            await channel.render({
                notification,
                id,
                recipient: { modelType: 'user', modelId: 5 },
                locale: 'nl',
            }),
            null,
        );
        assert.equal(toMail.mock.callCount(), 0);
    });

    it('refuses a notification that lists the mail channel but has no toMail()', async () => {
        await assert.rejects(
            channel.render({
                notification: new InvoiceVoided({ amount: 5 }),
                id,
                recipient: ada,
                locale: 'nl',
            }),
            new TypeError(
                '"invoice.voided" lists the mail channel but has no toMail()',
            ),
        );
    });
});

describe('MailChannel.send', () => {
    it('reports each mail by position, passing its error through, whatever order they finish in', async () => {
        const refused = new UndeliverableError('550 mailbox unavailable');
        const down = new Error('connection refused');

        provider.send.mock.mockImplementation(async ({ mail }) => {
            if (mail.to === 'ada@example.test') await setImmediate();
            if (mail.to === 'bob@example.test') throw refused;
            if (mail.to === 'cy@example.test') throw down;
        });

        assert.deepEqual(
            await channel.send({
                deliveries: [
                    aDelivery('ada@example.test'),
                    aDelivery('bob@example.test'),
                    aDelivery('cy@example.test'),
                ],
            }),
            [
                { status: DeliveryStatus.Sent },
                { status: DeliveryStatus.Failed, error: refused },
                { status: DeliveryStatus.Failed, error: down },
            ],
        );
    });

    it('fails only the mail of a provider that throws before returning a promise', async () => {
        const broken = new Error('no template');

        provider.send.mock.mockImplementation(((input: MailSendInput) => {
            if (input.mail.to === 'ada@example.test') throw broken;

            return Promise.resolve();
        }) as typeof provider.send);

        assert.deepEqual(
            await channel.send({
                deliveries: [
                    aDelivery('ada@example.test'),
                    aDelivery('bob@example.test'),
                ],
            }),
            [
                { status: DeliveryStatus.Failed, error: broken },
                { status: DeliveryStatus.Sent },
            ],
        );
    });

    it('sends 10 mails at a time', async () => {
        let inFlight = 0;
        let most = 0;

        provider.send.mock.mockImplementation(async () => {
            most = Math.max(most, ++inFlight);
            await setImmediate();
            inFlight--;
        });

        const results = await channel.send({
            deliveries: Array.from({ length: 25 }, (_, index) =>
                aDelivery(`user${index}@example.test`),
            ),
        });

        assert.equal(most, 10);
        assert.equal(provider.send.mock.callCount(), 25);
        assert.equal(results.length, 25);
    });

    it('starts the next mail as soon as one finishes, so a slow one holds back no group', async () => {
        let release = () => {};
        const slow = new Promise<void>((resolve) => {
            release = resolve;
        });

        provider.send.mock.mockImplementation(async ({ mail }) => {
            if (mail.to === 'user0@example.test') await slow;
        });

        const sending = channel.send({
            deliveries: Array.from({ length: 25 }, (_, index) =>
                aDelivery(`user${index}@example.test`),
            ),
        });

        for (let turn = 0; turn < 50; turn++) await setImmediate();

        assert.equal(
            provider.send.mock.callCount(),
            25,
            'waiting for the slowest of each 10 would stop at 10',
        );
        release();
        assert.equal((await sending).length, 25);
    });
});
