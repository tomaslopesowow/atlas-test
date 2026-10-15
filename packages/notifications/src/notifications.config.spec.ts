import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { notificationsConfig } from './notifications.config.js';

const mailEnv = {
    NOTIFICATIONS_MAIL_PROVIDER: 'smtp',
    MAIL_FROM: 'Atlas <noreply@atlas.test>',
    SMTP_HOST: 'smtp.atlas.test',
};

describe('notificationsConfig', () => {
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

    it('counts an empty variable as unset, as an unset env var arrives', () => {
        const config = notificationsConfig({
            NOTIFICATIONS_DEFAULT_LOCALE: '',
            NOTIFICATIONS_MAIL_PROVIDER: '',
            NOTIFICATIONS_PUSH_PROVIDERS: '',
            MAIL_FROM: '',
            SMTP_HOST: '',
            SMTP_PORT: '',
            SMTP_USER: '',
            SMTP_PASSWORD: '',
            EXPO_ACCESS_TOKEN: '',
        });

        assert.deepEqual(config, notificationsConfig({}));
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
