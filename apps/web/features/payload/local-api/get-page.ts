import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import type { AppLocale } from '@repo/i18n/shared';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import { getPayloadClient } from '../client';

export const getPageByPath = cache(
    async (pathname: string, isDraft = false) => {
        const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

        const [locale, payload, headersList] = await Promise.all([
            getLocale(),
            getPayloadClient(),
            isDraft ? headers() : Promise.resolve(null),
        ]);

        const auth = headersList
            ? await payload.auth({ headers: headersList })
            : null;

        const canViewDraftPages = isDraft && !!auth?.user;

        return payload
            .find({
                collection: 'pages',
                limit: 1,
                depth: 3,
                locale: locale as AppLocale,
                draft: canViewDraftPages,
                where: {
                    path: { equals: pathnameWithoutLocale },
                    ...(!canViewDraftPages && {
                        _status: { equals: 'published' },
                    }),
                },
            })
            .then((res) => res?.docs?.[0]);
    },
);
