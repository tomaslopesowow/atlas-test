import type { CollectionSlug, Config, Field } from 'payload';
import { generateAltTexts } from '../endpoints/generate-alt-texts';
import { AI_MEDIA_DESCRIPTION_COLLECTION_FIELDS } from './fields';
import { AI_MEDIA_DESCRIPTION_COLLECTION_AFTERCHANGE_HOOKS } from './hooks';

type AiMediaDescriptionPluginOptions = {
    enabled?: boolean;
    collection: CollectionSlug;
    openAiKey: string | undefined;
};

export const aiMediaDescriptionPlugin =
    ({
        enabled = true,
        collection: collectionSlug,
        openAiKey,
    }: AiMediaDescriptionPluginOptions) =>
    (incomingConfig: Config): Config => {
        if (!enabled) return incomingConfig;

        if (!openAiKey) {
            console.error('OpenAI API key not provided');
            return incomingConfig;
        }

        const config = { ...incomingConfig };

        const locales = incomingConfig.localization
            ? incomingConfig.localization.locales.map((locale) => {
                  if (typeof locale === 'string') return locale;
                  return locale.code;
              })
            : ['en'];

        // inject endpoints
        config.endpoints = [
            ...(config.endpoints ?? []),
            generateAltTexts({ openAiKey, locales }),
        ];

        const collection = config.collections?.find(
            (c) => c.slug === collectionSlug,
        );

        if (!collection) {
            console.error(`Collection with slug ${collectionSlug} not found`);
            return config;
        }

        // Remove the original description field from the media collection
        collection.fields = collection.fields.reduce((acc, field) => {
            if (field.type === 'text' && field.name === 'description')
                return acc;
            acc.push(field);
            return acc;
        }, [] as Field[]);

        // Add the new fields to the media collection
        collection?.fields.push(...AI_MEDIA_DESCRIPTION_COLLECTION_FIELDS);

        // Add the afterChange hook to the media collection
        collection.hooks = {
            ...(collection.hooks ?? {}),
            afterChange: [
                ...(collection.hooks?.afterChange ?? []),
                ...AI_MEDIA_DESCRIPTION_COLLECTION_AFTERCHANGE_HOOKS,
            ],
        };

        // Finally, return the modified config
        return config;
    };
