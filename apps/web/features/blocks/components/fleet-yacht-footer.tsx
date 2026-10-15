import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { ScrollRedirectFooter } from '../../animation/components/scroll-redirect-footer';
import { asDoc } from '../../payload/utils/as-doc';
import { ImageCMS } from '@/components/content/content-image';
import { getPayloadClient } from '../../payload/client';
import { Option, Schema } from 'effect';
import { Yacht } from '../../payload/features/devoogt/utils/devoogtdb-client';
import * as Sentry from '@sentry/nextjs';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import { getTranslations } from 'next-intl/server';

const LOG_PREFIX = '[fleet-yacht-footer]';

defineBlockComponent({
    slug: 'fleet-yacht-footer',
    component: async ({ page }) => {
        if (!isAllowedPageTaxonomy(page, ['fleet'])) return null;

        const [payload, t] = await Promise.all([
            getPayloadClient(),
            getTranslations('YachtDetail'),
        ]);

        const deVoogtData = Schema.decodeUnknownOption(Yacht)(
            page.taxonomyData.fleet?.deVoogtData,
        );

        if (Option.isNone(deVoogtData)) {
            payload.logger.warn(
                `${LOG_PREFIX} No deVoogt data found for yacht page`,
            );
            Sentry.captureException(
                new Error('No deVoogt data found for yacht page'),
                {
                    extra: {
                        page: page.title,
                        pageId: page.id,
                    },
                },
            );

            return null;
        }

        // Because the deVoogtData is not indexed in the database,
        // we use MongoDB aggregation to find the next and very first yacht page,

        let nextPageId = await payload.db.connection
            .collection('pages')
            .aggregate([
                {
                    $match: {
                        taxonomyType: 'fleet',
                        _status: 'published',
                        $or: [
                            {
                                'taxonomyData.fleet.deVoogtData.year': {
                                    $lt: deVoogtData.value.year,
                                },
                            },
                            {
                                'taxonomyData.fleet.deVoogtData.year':
                                    deVoogtData.value.year,
                                'taxonomyData.fleet.deVoogtData.hull': {
                                    $gt: deVoogtData.value.hull,
                                },
                            },
                        ],
                    },
                },
                {
                    $sort: {
                        'taxonomyData.fleet.deVoogtData.year': -1,
                        'taxonomyData.fleet.deVoogtData.hull': 1,
                    },
                },
                { $limit: 1 },
                { $project: { _id: 1 } },
            ])
            .toArray()
            .then((results) =>
                Schema.decodeUnknownOption(Schema.String)(
                    results[0]?._id?.toString(),
                ),
            )
            .catch((error) => {
                payload.logger.error(
                    `${LOG_PREFIX} Error aggregating next yacht page: ${error}`,
                );
                Sentry.captureException(error, {
                    extra: {
                        deVoogtData: deVoogtData.value,
                    },
                });
                return Option.none();
            });

        // If no next yacht page is found, we use the very first yacht page.
        if (Option.isNone(nextPageId)) {
            payload.logger.info(
                `${LOG_PREFIX} No next yacht page found; finding very first yacht page...`,
            );
            nextPageId = await payload.db.connection
                .collection('pages')
                .aggregate([
                    {
                        $match: {
                            taxonomyType: 'fleet',
                        },
                    },
                    {
                        $sort: {
                            'taxonomyData.fleet.deVoogtData.year': -1,
                            'taxonomyData.fleet.deVoogtData.hull': 1,
                        },
                    },
                    { $limit: 1 },
                    { $project: { _id: 1 } },
                ])
                .toArray()
                .then((results) =>
                    Schema.decodeUnknownOption(Schema.String)(
                        results[0]?._id?.toString(),
                    ),
                );
        }

        // If no very first yacht page is found, something is wrong, so we return null.
        if (Option.isNone(nextPageId)) {
            payload.logger.error(
                `${LOG_PREFIX} No next or very first yacht page found`,
            );
            Sentry.captureException(
                new Error('No next or very first yacht page found'),
            );
            return null;
        }

        // The aggregator returns raw MongoDB documents,
        // so we use the Payload client to get the localized page.
        const nextPage = await payload
            .find({
                collection: 'pages',
                where: {
                    id: { equals: nextPageId.value },
                    _status: { equals: 'published' },
                },
                limit: 1,
                depth: 1,
                draft: false,
                select: {
                    title: true,
                    permalink: true,
                    path: true,
                    taxonomyData: {
                        fleet: {
                            cover: true,
                        },
                    },
                },
                populate: {
                    pages: {
                        taxonomyData: {
                            fleet: {
                                cover: true,
                            },
                        },
                    },
                },
            })
            .then((res) => Option.fromNullable(res.docs[0]))
            .catch((error) => {
                payload.logger.error(
                    `${LOG_PREFIX} Error finding next yacht page: ${error}`,
                );
                Sentry.captureException(error, {
                    extra: {
                        nextPageId: nextPageId.value,
                        deVoogtData: deVoogtData.value,
                    },
                });
                return Option.none();
            });

        // Related yacht is required for navigation and interactions.
        if (Option.isNone(nextPage)) {
            Sentry.captureException(new Error('No next yacht page found'), {
                extra: {
                    nextPageId: nextPageId.value,
                    deVoogtData: deVoogtData.value,
                },
            });
            return null;
        }

        const { title, permalink } = nextPage.value;
        const cover = asDoc(nextPage.value.taxonomyData?.fleet?.cover);

        return (
            <div className="flex flex-col" data-hide-footer>
                <ImageCMS
                    className="w-full aspect-[1440/900] 2xl:aspect-video"
                    image={page.taxonomyData.fleet?.gallery?.[0]?.image}
                />

                {title != null && permalink != null && (
                    <ScrollRedirectFooter
                        eyebrow={t('nextFeadship')}
                        title={title}
                        cover={cover}
                        permalink={permalink}
                    />
                )}
            </div>
        );
    },
});
