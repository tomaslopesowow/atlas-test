import { I18N_LOCALES } from '@repo/i18n/shared';
import type { CollectionAfterChangeHook } from 'payload';

export const AI_MEDIA_DESCRIPTION_COLLECTION_AFTERCHANGE_HOOKS: CollectionAfterChangeHook[] =
    [
        async ({
            doc: { description, restLocalesDescriptions, id },
            previousDoc: { description: previousDescription },
            req: { locale: currentLocale, payload },
        }) => {
            if (description === previousDescription || !restLocalesDescriptions)
                return;

            const targetLocales = I18N_LOCALES.filter(
                (locale) => locale !== currentLocale,
            );

            if (!targetLocales.length) return;

            const translations = JSON.parse(restLocalesDescriptions);

            for (const locale of targetLocales) {
                const description = translations[locale];
                if (!description) continue;

                await payload.update({
                    collection: 'media',
                    id,
                    locale,
                    data: {
                        description,
                    },
                });
            }
        },
    ];
