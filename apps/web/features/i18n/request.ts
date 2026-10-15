import { getRawMessages } from '@repo/i18n/messages/get-raw-messages';
import {
    type AppLocale,
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
} from '@repo/i18n/shared';
import { getRequestConfig } from 'next-intl/server';
import { objectOmit } from '@/utils/object-omit';
import { getMessages } from '../payload/local-api/get-messages';

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = ((await requestLocale) ?? I18N_DEFAULT_LOCALE) as AppLocale;
    if (!I18N_LOCALES.includes(locale)) locale = I18N_DEFAULT_LOCALE;

    const [staticMessages, contentMessages] = await Promise.all([
        getRawMessages(locale),
        getMessages(locale),
    ]);

    return {
        locale,
        messages: {
            ...staticMessages,
            ...objectOmit(contentMessages, 'createdAt', 'updatedAt', 'id'),
        },
    };
});
