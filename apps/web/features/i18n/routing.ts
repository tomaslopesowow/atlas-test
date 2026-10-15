import {
    I18N_DEFAULT_LOCALE,
    I18N_LOCALES,
    I18N_LOCALE_PREFIX,
} from '@repo/i18n/shared';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: I18N_LOCALES,
    defaultLocale: I18N_DEFAULT_LOCALE,
    localePrefix: I18N_LOCALE_PREFIX,
});

export const {
    Link: LinkI18n,
    redirect,
    usePathname,
    useRouter,
    getPathname,
} = createNavigation(routing);
