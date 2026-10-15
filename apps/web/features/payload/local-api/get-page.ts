import type { AppLocale } from '@repo/i18n/shared';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import { getPayloadClient } from '../client';

type GetPageByPathOptions = {
    isDraft?: boolean;
    /**
     * If true, the path is already without locale prefix.
     * Use this when passing a resolved route alias path.
     */
    isPathWithoutLocale?: boolean;
};

export const getPageByPath = cache(
    async (pathname: string, options: GetPageByPathOptions = {}) => {
        const { isDraft = false, isPathWithoutLocale = false } = options;

        const path = isPathWithoutLocale
            ? pathname
            : getPathnameWithoutLocale(pathname);

        const [locale, payload, headersList] = await Promise.all([
            getLocale(),
            getPayloadClient(),
            isDraft ? headers() : Promise.resolve(null),
        ]);

        const auth = headersList
            ? await payload.auth({ headers: headersList })
            : null;

        return payload
            .find({
                collection: 'pages',
                limit: 1,
                depth: 3,
                locale: locale as AppLocale,
                draft: isDraft && !!auth?.user,
                where: {
                    path: { equals: path },
                },
                context: {
                    updateDeVoogtData: true,
                    updateYatcoData: true,
                },
            })
            .then((res) => res?.docs?.[0]);
    },
);
