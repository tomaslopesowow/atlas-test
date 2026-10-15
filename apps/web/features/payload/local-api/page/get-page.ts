import type { AppLocale } from '@repo/i18n/shared';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import { getPayloadClient } from '../../client';
import { DEFAULT_EXCLUDED_FIELDS } from './get-page.shared';
import type { PageField, PublicPage } from './get-page.types';

const getPageByPathCached = cache(
    async (
        pathname: string,
        isDraft = false,
    ): Promise<PublicPage | undefined> => {
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

        const select = DEFAULT_EXCLUDED_FIELDS.reduce(
            (acc: Partial<Record<PageField, false>>, field) => {
                acc[field] = false;
                return acc;
            },
            {},
        );

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
                select,
            })
            .then((res) => res?.docs?.[0] as PublicPage | undefined);
    },
);

export const getPageByPath = (pathname: string, isDraft = false) =>
    getPageByPathCached(pathname, isDraft);
