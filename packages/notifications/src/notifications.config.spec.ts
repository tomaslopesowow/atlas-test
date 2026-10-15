import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { notificationsConfig } from './notifications.config.js';

const mailEnv = {
    NOTIFICATIONS_MAIL_PROVIDER: 'smtp',
    MAIL_FROM: 'Atlas <noreply@atlas.test>',
    SMTP_HOST: 'smtp.atlas.test',
};

describe('notificationsConfig', () => {
    it('registers under the notifications namespace', () => {
        assert.equal(notificationsConfig.KEY, 'CONFIGURATION(notifications)');
    });

    it('leaves mail and push off by default, with SMTP on port 587', () => {
        assert.deepEqual(notificationsConfig({}), {
            defaultLocale: 'en',
            mail: {
                provider: undefined,
                from: undefined,
                smtp: {
                    host: undefined,
                    port: 587,
                    user: undefined,
                    password: undefined,
                },
            },
            push: { providers: [] },
            expo: { accessToken: undefined },
        });
    });

    it('groups the mail variables', () => {
        assert.deepEqual(
            notificationsConfig({
                ...mailEnv,
                SMTP_PORT: '465',
                SMTP_USER: 'atlas',
                SMTP_PASSWORD: 'secret',
            }).mail,
            {
                provider: 'smtp',
                from: 'Atlas <noreply@atlas.test>',
                smtp: {
                    host: 'smtp.atlas.test',
                    port: 465,
                    user: 'atlas',
                    password: 'secret',
                },
            },
        );
    });

    it('reads the push providers as a comma-separated list', () => {
        assert.deepEqual(
            notificationsConfig({
                NOTIFICATIONS_PUSH_PROVIDERS: ' expo, ,apns ',
            }).push.providers,
            ['expo', 'apns'],
        );
    });

    it('needs MAIL_FROM only once a mail provider is set, counting an empty one as missing', () => {
        assert.doesNotThrow(() => notificationsConfig({}));
        assert.throws(
            () =>
                notificationsConfig({
                    NOTIFICATIONS_MAIL_PROVIDER: 'postmark',
                }),
            /MAIL_FROM must be a string/,
        );
        assert.throws(
            () =>
                notificationsConfig({
                    NOTIFICATIONS_MAIL_PROVIDER: 'postmark',
                    MAIL_FROM: '',
                }),
            /MAIL_FROM should not be empty/,
        );
    });

    it('needs SMTP_HOST only for the smtp provider', () => {
        const { SMTP_HOST: _, ...withoutHost } = mailEnv;

        assert.doesNotThrow(() =>
            notificationsConfig({
                ...withoutHost,
                NOTIFICATIONS_MAIL_PROVIDER: 'postmark',
            }),
        );
        assert.throws(() => notificationsConfig(withoutHost), /SMTP_HOST/);
        assert.throws(
            () => notificationsConfig({ ...mailEnv, SMTP_HOST: '' }),
            /SMTP_HOST should not be empty/,
        );
    });

    it('reads the port as a whole number from 1 to 65535', () => {
        for (const port of [1, 65_535])
            assert.equal(
                notificationsConfig({ SMTP_PORT: String(port) }).mail.smtp.port,
                port,
            );

        for (const port of ['0', '65536', '1.5', 'abc'])
            assert.throws(
                () => notificationsConfig({ SMTP_PORT: port }),
                /SMTP_PORT/,
                port,
            );
    });

    it('counts an empty variable as unset, as an unset env var arrives', () => {
        const config = notificationsConfig({
            NOTIFICATIONS_MAIL_PROVIDER: '',
            NOTIFICATIONS_PUSH_PROVIDERS: '',
            MAIL_FROM: '',
            SMTP_HOST: '',
            SMTP_USER: '',
            SMTP_PASSWORD: '',
            EXPO_ACCESS_TOKEN: '',
        });

        assert.deepEqual(config, notificationsConfig({}));
    });

    it('falls back to port 587 for an empty SMTP_PORT', () => {
        assert.equal(
            notificationsConfig({ SMTP_PORT: '' }).mail.smtp.port,
            587,
        );
    });

    it('falls back to "en" for an empty NOTIFICATIONS_DEFAULT_LOCALE', () => {
        assert.equal(
            notificationsConfig({ NOTIFICATIONS_DEFAULT_LOCALE: '' })
                .defaultLocale,
            'en',
        );
    });

    it('reports every problem at once', () => {
        assert.throws(
            () =>
                notificationsConfig({
                    NOTIFICATIONS_MAIL_PROVIDER: 'smtp',
                    SMTP_PORT: '0',
                }),
            (error: Error) =>
                ['MAIL_FROM', 'SMTP_HOST', 'SMTP_PORT'].every((name) =>
                    error.message.includes(name),
                ),
        );
    });
});
