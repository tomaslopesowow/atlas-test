import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs';
import { redirectsPlugin } from '@payloadcms/plugin-redirects';
import { searchPlugin } from '@payloadcms/plugin-search';
import { seoPlugin } from '@payloadcms/plugin-seo';
import {
    FixedToolbarFeature,
    lexicalEditor,
    TextStateFeature,
} from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { en } from '@payloadcms/translations/languages/en';
import { nl } from '@payloadcms/translations/languages/nl';
import { I18N_DEFAULT_LOCALE, I18N_LOCALES } from '@repo/i18n/shared';
import { payloadVideoTranscodingPlugin } from '@repo/payload-video-transcoding-plugin';
import {
    type Access,
    buildConfig,
    type Field,
    type Locale,
    type RelationshipField,
} from 'payload';
import sharp from 'sharp';
import { allCollections } from '@/features/payload/collections/all';
import { allGlobals } from '@/features/payload/globals/all';
import { seoPluginConfig } from '@/features/payload/plugins/seo';
import { allBlocks } from './features/payload/blocks/all';
import { aiMediaDescriptionPlugin } from './features/payload/features/ai-media-description/plugin';
import { createFleetPageTask } from './features/payload/features/devoogt/tasks/create-fleet-page';
import { refreshFleetDeVoogtDataTask } from './features/payload/features/devoogt/tasks/refresh-fleet-devoogt-data';
import { syncFleetTask } from './features/payload/features/devoogt/tasks/sync-fleet';
import { oneTimePasswordPlugin } from './features/payload/features/otp/plugin';
import { permissionBasedAccessPlugin } from './features/payload/features/permission-based-access/plugin';
import { taxonomyPlugin } from './features/payload/features/taxonomies/plugin';
import { taxonomyConfigs } from './features/payload/features/taxonomies/taxonomies';
import { createResalePageTask } from './features/payload/features/yatco/tasks/create-resale-page';
import { refreshResaleYatcoDataTask } from './features/payload/features/yatco/tasks/refresh-resale-yatco-data';
import { syncYatcoResaleTask } from './features/payload/features/yatco/tasks/sync-yatco-resale';
import { createUploadFromUrlTask } from './features/payload/tasks/create-upload-from-url';
import { createNodemailerTransport } from './features/payload/utils/create-nodemailer-transport';
import { seed } from './seed';
import { seedArticleFromCraftCMSTask } from './features/payload/features/taxonomies/tasks/seed-article-from-craftcms';
import { seedAllArticlesFromCraftCMSTask } from './features/payload/features/taxonomies/tasks/seed-all-articles-from-craftcms';
import { seedPressEntryFromCraftCMSTask } from './features/payload/features/taxonomies/tasks/seed-press-entry-from-craftcms';
import { seedAllPressEntriesFromCraftCMSTask } from './features/payload/features/taxonomies/tasks/seed-all-press-entries-from-craftcms';
import { createImageField } from './features/payload/fields/image';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const payloadLibPath = path.resolve(dirname);

const LEXICAL_FEATURES_EXCLUDE = ['relationship'];

export default buildConfig({
    onInit: async (payload) => {
        await seed(payload);
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

    blocks: allBlocks,
    collections: allCollections,

    editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
            ...defaultFeatures.filter(
                (feature) => !LEXICAL_FEATURES_EXCLUDE.includes(feature.key),
            ),
            TextStateFeature({
                state: {
                    textTransform: {
                        uppercase: {
                            label: 'Uppercase',
                            css: { 'text-transform': 'uppercase' },
                        },
                    },
                },
            }),
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
                defaultValue: '307',
            },
        }),

        nestedDocsPlugin({
            collections: ['pages'],
            parentFieldSlug: 'parent',
            generateLabel: (_, doc) => doc.title as string,
            generateURL: (docs) =>
                docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
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
                'scroll-videos': {
                    generateFileURL: ({ filename, prefix }) => {
                        return new URL(
                            [prefix, filename].filter(Boolean).join('/'),
                            process.env.S3_CDN_URL ?? '',
                        ).href;
                    },
                },
            },
        }),

        payloadVideoTranscodingPlugin({
            // enabled: process.env.NODE_ENV === 'production',
            enabled: true,
            apiEndpoint: process.env.TRANSCODER_API_ENDPOINT!,
            apiClientId: process.env.TRANSCODER_API_CLIENT_ID!,
            apiClientSecret: process.env.TRANSCODER_API_CLIENT_SECRET!,
            cdn: process.env.S3_CDN_URL!,
            collections: {
                'scroll-videos': {
                    bucket: process.env.S3_BUCKET!,
                    mimeTypes: [/video\/.+/],
                    acl: 'public-read',
                    webhook: true,
                    variants: {
                        vp9: {
                            type: 'video',
                            format: 'mp4',
                            codec: 'vp9',
                            width: 1920,
                            height: -1,
                            customPixFormat: 'yuv420p',
                            keyframesIntervalSeconds: 20,
                        },
                        vp9Mobile: {
                            type: 'video',
                            format: 'mp4',
                            codec: 'vp9',
                            width: 640,
                            height: -1,
                            customPixFormat: 'yuv420p',
                            keyframesIntervalSeconds: 20,
                        },
                    },
                },
            },
        }),

        searchPlugin({
            collections: ['pages'],
            searchOverrides: {
                fields: ({ defaultFields }) => [
                    ...defaultFields,

                    {
                        name: 'taxonomyType',
                        type: 'text',
                    },
                    {
                        name: 'permalink',
                        type: 'text',
                        localized: true,
                    },
                    createImageField(),
                    {
                        name: 'date',
                        type: 'text',
                        localized: true,
                    },
                ],
            },

            beforeSync: async ({ originalDoc, searchDoc }) => {
                return {
                    ...searchDoc,
                    taxonomyType: originalDoc?.taxonomyType,
                    permalink: originalDoc?.permalink,
                    image: originalDoc?.taxonomyData?.[
                        originalDoc?.taxonomyType
                    ]?.cover,
                    date:
                        originalDoc?.taxonomyType === 'news'
                            ? originalDoc?.publishedAt
                            : null,
                };
            },
        }),

        aiMediaDescriptionPlugin({
            enabled: !!process.env.OPENAI_API_KEY,
            collection: 'media',
            openAiKey: process.env.OPENAI_API_KEY,
        }),
    ],

    secret: process.env.PAYLOAD_SECRET ?? 'UNSAFE_GENERIC_SECRET',

    sharp,

    telemetry: false,

    typescript: {
        outputFile: path.resolve(payloadLibPath, 'payload-types.ts'),
    },

    jobs: {
        jobsCollectionOverrides({ defaultJobsCollection }) {
            defaultJobsCollection.admin ??= {};
            defaultJobsCollection.admin.hidden = false;

            const jobAccess: Access = ({ req }) => !!req.user?.isSuperUser;
            defaultJobsCollection.access ??= {};
            defaultJobsCollection.access.create = jobAccess;
            defaultJobsCollection.access.read = jobAccess;
            defaultJobsCollection.access.update = jobAccess;
            defaultJobsCollection.access.delete = jobAccess;

            return defaultJobsCollection;
        },

        tasks: [
            createUploadFromUrlTask,

            // Yatco
            syncYatcoResaleTask,
            createResalePageTask,
            refreshResaleYatcoDataTask,

            // De Voogt DB
            syncFleetTask,
            createFleetPageTask,
            refreshFleetDeVoogtDataTask,

            // Craft CMS migrations
            seedAllArticlesFromCraftCMSTask,
            seedArticleFromCraftCMSTask,
            seedAllPressEntriesFromCraftCMSTask,
            seedPressEntryFromCraftCMSTask,
        ],

        autoRun: [
            {
                cron: '*/1 * * * * *', // every second
                limit: 1,
                queue: 'taxonomy-sync',
            },
            {
                // Keep media sync jobs limited to avoid overwhelming the system.
                // Use the PAYLOAD_JOB_CRON_MEDIA_SYNC environment variable to configure the cron.
                // Processing large 4K images (20+ MB) can spike CPU/memory significantly.
                // Increase interval if server crashes persist due to concurrent resizes.
                cron:
                    process.env.PAYLOAD_JOB_CRON_MEDIA_SYNC || '*/30 * * * * *',
                limit: 1, // Limit to 1 job per tick to prevent concurrent resizes
                queue: 'media-sync',
            },
            {
                cron: '0 4 * * *', // every night at 04:00
                queue: 'nightly',
            },
        ],
    },

    email:
        process.env.NODE_ENV === 'production'
            ? nodemailerAdapter({
                  transport: await createNodemailerTransport(),
                  defaultFromAddress:
                      process.env.MAIL_FROM_ADDRESS ?? 'no-reply@feadship.com',
                  defaultFromName: process.env.MAIL_FROM_NAME ?? 'PayloadCMS',
              })
            : undefined,
});
