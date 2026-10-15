import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { redirectsPlugin } from '@payloadcms/plugin-redirects';
import { searchPlugin } from '@payloadcms/plugin-search';
import { seoPlugin } from '@payloadcms/plugin-seo';
import {
    FixedToolbarFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { en } from '@payloadcms/translations/languages/en';
import { nl } from '@payloadcms/translations/languages/nl';
import { I18N_DEFAULT_LOCALE, I18N_LOCALES } from '@repo/i18n/shared';
import {
    buildConfig,
    type Field,
    type Locale,
    type RelationshipField,
} from 'payload';
import sharp from 'sharp';
import { allCollections } from '@/features/payload/collections/all';
import { allGlobals } from '@/features/payload/globals/all';
import { seoPluginConfig } from '@/features/payload/plugins/seo';
import { aiMediaDescriptionPlugin } from './features/payload/features/ai-media-description/plugin';
import { contentPipelinePlugin } from './features/payload/features/content-pipeline/plugin';
import { hideJoinOnCreate } from './features/payload/features/hide-join-on-create';
import { oneTimePasswordPlugin } from './features/payload/features/otp/plugin';
import { permissionBasedAccessPlugin } from './features/payload/features/permission-based-access/plugin';
import { taxonomyPlugin } from './features/payload/features/taxonomies/plugin';
import { taxonomyConfigs } from './features/payload/features/taxonomies/taxonomies';
import { createDefaultPageTemplates } from './features/payload/utils/create-default-templates';
import { createFirstUser } from './features/payload/utils/create-first-user';
import { createNodemailerTransport } from './features/payload/utils/create-nodemailer-transport';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const payloadLibPath = path.resolve(dirname);

const LEXICAL_FEATURES_EXCLUDE = ['relationship'];

export default buildConfig({
    onInit: async (payload) => {
        await createFirstUser(payload);
        await createDefaultPageTemplates(payload);
    },

    i18n: {
        translations: {
            en,
            nl,
        },
    },

    db: mongooseAdapter({
        url: process.env.DATABASE_URI ?? 'MISSING_DATABASE_URI',
        migrationDir: path.resolve(dirname, 'migrations'),
    }),

    collections: allCollections,

    editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
            ...defaultFeatures.filter(
                (feature) => !LEXICAL_FEATURES_EXCLUDE.includes(feature.key),
            ),
            FixedToolbarFeature({ applyToFocusedEditor: true }),
        ],
    }),

    globals: allGlobals,

    localization: {
        locales: I18N_LOCALES.map<Locale>((locale) => ({
            label: locale,
            code: locale,
            fallbackLocale: I18N_DEFAULT_LOCALE,
        })),
        defaultLocale: I18N_DEFAULT_LOCALE,
        fallback: true,
    },

    plugins: [
        oneTimePasswordPlugin({
            collection: 'users',
        }),

        permissionBasedAccessPlugin({
            collection: 'users',
        }),

        taxonomyPlugin({
            collection: 'pages',
            taxonomies: taxonomyConfigs as Record<string, Field[]>,

            inject: (collection, { selectField, dataField }) => {
                // Add the data field to the content tab
                collection.fields
                    .find((field) => field.type === 'tabs')
                    ?.tabs.find((tab) => tab.label === 'Content')
                    ?.fields?.unshift(dataField);

                const templateFieldIndex = collection.fields.findIndex(
                    (field) => (field as RelationshipField).name === 'template',
                );

                // Add the select field to the sidebar, after the template field
                collection.fields.splice(templateFieldIndex + 1, 0, {
                    ...selectField,
                    admin: { ...selectField.admin, position: 'sidebar' },
                });
            },
        }),

        seoPlugin(seoPluginConfig),

        redirectsPlugin({
            collections: ['pages'],
            redirectTypes: ['307', '308'],
            redirectTypeFieldOverride: {
                defaultValue: '308',
            },
        }),

        s3Storage({
            enabled: process.env.NODE_ENV === 'production',
            bucket: process.env.S3_BUCKET ?? 'MISSING_S3_BUCKET',
            acl: 'public-read',
            config: {
                endpoint: process.env.S3_ENDPOINT,
                credentials: {
                    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
                    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
                },
                region: process.env.S3_REGION,
            },
            collections: {
                media: {
                    generateFileURL: ({ filename, prefix }) => {
                        return new URL(
                            [prefix, filename].filter(Boolean).join('/'),
                            process.env.S3_CDN_URL ?? '',
                        ).href;
                    },
                },
            },
        }),

        searchPlugin({
            collections: ['pages'],
        }),

        aiMediaDescriptionPlugin({
            enabled: !!process.env.OPENAI_API_KEY,
            collection: 'media',
            openAiKey: process.env.OPENAI_API_KEY,
        }),

        contentPipelinePlugin({
            enabled: process.env.CONTENT_PIPELINE_ENABLED === 'yes',
            articleCollection: 'pages',
            articleTaxonomies: ['news'],
            defaultArticleTaxonomy: 'news',
            locales: [...I18N_LOCALES],
            defaultLocale: I18N_DEFAULT_LOCALE,
            runtime: {
                dataForSeo: {
                    login: process.env.DATAFORSEO_LOGIN,
                    password: process.env.DATAFORSEO_PASSWORD,
                },
                anthropic: {
                    apiKey: process.env.ANTHROPIC_API_KEY,
                },
                fal: {
                    apiKey: process.env.FAL_KEY,
                },
                mastra: {
                    url: process.env.MASTRA_DB_URL,
                    authToken: process.env.MASTRA_DB_AUTH_TOKEN,
                },
                adminBaseUrl: process.env.CONTENT_PIPELINE_ADMIN_URL,
            },
        }),

        hideJoinOnCreate(),
    ],

    secret: process.env.PAYLOAD_SECRET ?? 'UNSAFE_GENERIC_SECRET',

    sharp,

    telemetry: false,

    typescript: {
        outputFile: path.resolve(payloadLibPath, 'payload-types.ts'),
    },

    email: nodemailerAdapter({
        transport: await createNodemailerTransport(),
        defaultFromAddress: process.env.MAIL_FROM_ADDRESS ?? 'no-reply@owow.io',
        defaultFromName: process.env.MAIL_FROM_NAME ?? 'PayloadCMS',
    }),
});
