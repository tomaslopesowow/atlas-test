import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { AppLocale } from '@repo/i18n/shared';
import { getPayloadClient } from '@/features/payload/client';
import { Option, pipe, Schema } from 'effect';
import * as Sentry from '@sentry/nextjs';
import { getLocale } from 'next-intl/server';
import {
    LAYOUT_MODES,
    RESALE_SORT_OPTIONS,
    type OverviewFilters,
} from '@/components/common/filter-shared';
import {
    type FormattedResaleYacht,
    formatResaleYacht,
} from '@/utils/format-yacht';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import { ResaleListClient } from './resale-list.client';

const LOG_PREFIX = '[resale-list]';
const PAGE_SIZE = 12;

defineBlockComponent({
    slug: 'resale-list',
    component: async ({ block, pageProps }) => {
        const [payload, locale, params] = await Promise.all([
            getPayloadClient(),
            getLocale(),
            pageProps.searchParams,
        ]);

        const paginationPage = pipe(
            params.page,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrElse(() => 1),
        );

        const sort = pipe(
            params.sort,
            Schema.decodeUnknownOption(Schema.Literal(...RESALE_SORT_OPTIONS)),
            Option.getOrElse(() => '-year' as const),
        );

        const search = pipe(
            params.search,
            Schema.decodeUnknownOption(Schema.String),
            Option.map(decodeURIComponent),
            Option.getOrUndefined,
        );

        const layoutMode = pipe(
            params.layoutMode,
            Schema.decodeUnknownOption(
                Schema.Union(Schema.Literal(...LAYOUT_MODES)),
            ),
            Option.getOrElse(() => 'grid' as const),
        );

        const lengthMin = pipe(
            params.lengthMin,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrUndefined,
        );

        const lengthMax = pipe(
            params.lengthMax,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrUndefined,
        );

        const yearMin = pipe(
            params.yearMin,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrUndefined,
        );

        const yearMax = pipe(
            params.yearMax,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrUndefined,
        );

        const priceMin = pipe(
            params.priceMin,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrUndefined,
        );

        const priceMax = pipe(
            params.priceMax,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrUndefined,
        );

        const filters: OverviewFilters = {};
        if (lengthMin != null && lengthMax != null) {
            filters.length = [lengthMin, lengthMax];
        }
        if (yearMin != null && yearMax != null) {
            filters.year = [yearMin, yearMax];
        }
        if (priceMin != null && priceMax != null) {
            filters.price = [priceMin, priceMax];
        }

        payload.logger.info(
            `${LOG_PREFIX} Fetching resale yachts with parameters:`,
        );
        payload.logger.info({
            paginationPage,
            sort,
            search,
            layoutMode,
            lengthMin,
            lengthMax,
            yearMin,
            yearMax,
            priceMin,
            priceMax,
        });

        let aggregatedPaginatedYachtsData: FormattedResaleYacht[] = [];
        let totalPages = 1;
        let totalDocs = 0;

        try {
            const matchConditions: Record<
                string,
                | string
                | number
                | Record<string, unknown>
                | Record<string, unknown>[]
            > = {
                taxonomyType: 'resale',
                _status: 'published',
            };

            if (yearMin !== undefined || yearMax !== undefined) {
                matchConditions[
                    'taxonomyData.resale.yatcoData.Info.YearBuilt'
                ] = {
                    ...(yearMin !== undefined && { $gte: yearMin }),
                    ...(yearMax !== undefined && { $lte: yearMax }),
                };
            }

            if (lengthMin !== undefined || lengthMax !== undefined) {
                matchConditions[
                    'taxonomyData.resale.yatcoData.Dimension.Length'
                ] = {
                    ...(lengthMin !== undefined && { $gte: lengthMin }),
                    ...(lengthMax !== undefined && { $lte: lengthMax }),
                };
            }

            if (priceMin !== undefined || priceMax !== undefined) {
                matchConditions[
                    'taxonomyData.resale.yatcoData.Listing.AskingPrice'
                ] = {
                    ...(priceMin !== undefined && { $gte: priceMin }),
                    ...(priceMax !== undefined && { $lte: priceMax }),
                };
            }

            if (search) {
                matchConditions.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    {
                        'taxonomyData.resale.yatcoData.Description.VesselName':
                            {
                                $regex: search,
                                $options: 'i',
                            },
                    },
                ];

                const searchAsNumber = Number.parseInt(search, 10);
                if (!Number.isNaN(searchAsNumber)) {
                    (matchConditions.$or as Record<string, unknown>[]).push({
                        'taxonomyData.resale.yatcoData.Listing.HullID': search,
                    });
                }
            }

            payload.logger.info(`${LOG_PREFIX} Match conditions:`);
            payload.logger.info(matchConditions);

            const sortStage: Record<string, 1 | -1> = {};

            if (sort) {
                const isDescending = sort.startsWith('-');
                const fieldName = isDescending ? sort.slice(1) : sort;
                const direction: 1 | -1 = isDescending ? -1 : 1;

                switch (fieldName) {
                    case 'name':
                        sortStage.title = direction;
                        break;
                    case 'year':
                        sortStage[
                            'taxonomyData.resale.yatcoData.Info.YearBuilt'
                        ] = direction;
                        break;
                    case 'price':
                        sortStage[
                            'taxonomyData.resale.yatcoData.Listing.AskingPrice'
                        ] = direction;
                        break;
                    default:
                        sortStage.title = direction;
                }
            } else {
                sortStage['taxonomyData.resale.yatcoData.Info.YearBuilt'] = -1;
                sortStage.title = 1;
            }

            payload.logger.info(`${LOG_PREFIX} Sort stage:`);
            payload.logger.info(sortStage);

            const aggregateResult = await payload.db.connection
                .collection('pages')
                .aggregate([
                    { $match: matchConditions },
                    { $sort: sortStage },
                    {
                        $facet: {
                            metadata: [{ $count: 'totalDocs' }],
                            data: [
                                {
                                    $skip: (paginationPage - 1) * PAGE_SIZE,
                                },
                                { $limit: PAGE_SIZE },
                                { $project: { _id: 1 } },
                            ],
                        },
                    },
                ])
                .toArray();

            const { metadata, data } = aggregateResult[0] || {
                metadata: [],
                data: [],
            };
            totalDocs = metadata[0]?.totalDocs || 0;
            totalPages = Math.ceil(totalDocs / PAGE_SIZE);

            payload.logger.info(
                `${LOG_PREFIX} Aggregate result - totalDocs: ${totalDocs}, totalPages: ${totalPages}`,
            );

            if (data.length > 0) {
                const ids = data.map(
                    (doc: { _id: { toString: () => string } }) =>
                        doc._id.toString(),
                );

                const fullDocs = await payload.find({
                    collection: 'pages',
                    where: {
                        id: {
                            in: ids,
                        },
                    },
                    limit: PAGE_SIZE,
                    locale: locale as AppLocale,
                });

                const docsMap = new Map(
                    fullDocs.docs.map((doc) => [doc.id, doc]),
                );

                type PageDoc = (typeof fullDocs.docs)[number];

                const orderedDocs = ids
                    .map((id: string) => docsMap.get(id))
                    .filter(
                        (doc: PageDoc | undefined): doc is PageDoc =>
                            doc != null,
                    );

                aggregatedPaginatedYachtsData = orderedDocs
                    .map((page: PageDoc) =>
                        formatResaleYacht(
                            page as PageWithGenericTaxonomies<'resale'>,
                            locale,
                        ),
                    )
                    .filter(
                        (
                            x: FormattedResaleYacht | null,
                        ): x is FormattedResaleYacht => x != null,
                    );
            }
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    component: 'resale-list',
                    operation: 'mongodb-aggregate-pagination',
                },
                extra: {
                    paginationPage,
                    sort,
                    search,
                    yearMin,
                    yearMax,
                    lengthMin,
                    lengthMax,
                    priceMin,
                    priceMax,
                },
            });

            console.error(
                'Error fetching resale yachts with aggregates:',
                error,
            );

            aggregatedPaginatedYachtsData = [];
            totalPages = 1;
            totalDocs = 0;
        }

        return (
            <ResaleListClient
                {...block}
                items={aggregatedPaginatedYachtsData}
                layoutMode={layoutMode}
                currentPage={paginationPage}
                totalPages={totalPages}
                totalDocs={totalDocs}
                filters={filters}
                search={search}
                sort={sort}
            />
        );
    },
});
