import type { AppLocale } from '@repo/i18n/shared';
import type { EcommerceSettings } from '@repo/shopify/types';
import { getLocale } from 'next-intl/server';
import type { GlobalSlug } from 'payload';
import { cache } from 'react';
import { getPayloadClient } from '../client';

export const getEcommerce = cache(
    async (): Promise<EcommerceSettings | null> => {
        if (process.env.NEXT_PUBLIC_ECOMMERCE !== 'yes') return null;

        const [locale, payload] = await Promise.all([
            getLocale(),
            getPayloadClient(),
        ]);

        const ecommerce = await payload.findGlobal({
            slug: 'ecommerce' as GlobalSlug,
            locale: locale as AppLocale,
        });

        return ecommerce as EcommerceSettings;
    },
);
