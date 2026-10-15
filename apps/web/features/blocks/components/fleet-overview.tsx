import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import * as Sentry from '@sentry/nextjs';
import {
    DISPLAY_MODES,
    type FleetFilters,
    LAYOUT_MODES,
    SORT_OPTIONS,
} from '@/components/fleet-overview/shared';
import {
    type FormattedFleetYacht,
    formatFleetYacht,
} from '@/utils/format-yacht';
import { getPayloadClient } from '../../payload/client';
import type { PageWithGenericTaxonomies } from '../../payload/features/taxonomies/types';
import { FleetOverviewClient } from './fleet-overview.client';
import { Option, pipe, Schema } from 'effect';
import { FleetOverviewSpotlight } from '@/components/fleet-overview/spotlight';
import { FleetOverviewAll } from '@/components/fleet-overview/all';

const LOG_PREFIX = '[fleet-overview]';

defineBlockComponent({
    slug: 'fleet-overview',
    component: async ({ block, pageProps }) => {
        const PAGE_SIZE = 12;

        const [payload, params] = await Promise.all([
            getPayloadClient(),
            pageProps.searchParams,
        ]);

        const paginationPage = pipe(
            params.page,
            Schema.decodeUnknownOption(Schema.NumberFromString),
            Option.getOrElse(() => 1),
        );

        const sort = pipe(
            params.sort,
            Schema.decodeUnknownOption(Schema.Literal(...SORT_OPTIONS)),
            Option.getOrElse(() => '-year' as const),
        );

        const search = pipe(
            params.search,
            Schema.decodeUnknownOption(Schema.String),
            Option.map(decodeURIComponent),
            Option.getOrUndefined,
        );

        const displayMode = pipe(
            params.displayMode,
            Schema.decodeUnknownOption(
                Schema.Union(Schema.Literal(...DISPLAY_MODES)),
            ),
            Option.getOrElse(() => 'spotlight' as const),
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

        const filters: FleetFilters = {};
        if (lengthMin && lengthMax) {
            filters.length = [lengthMin, lengthMax];
        }
        if (yearMin && yearMax) {
            filters.year = [yearMin, yearMax];
        }

        payload.logger.info(
            `${LOG_PREFIX} Fetching fleet yachts with parameters:`,
        );
        payload.logger.info({
            paginationPage,
            sort,
            search,
            displayMode,
            layoutMode,
            lengthMin,
            lengthMax,
            yearMin,
            yearMax,
        });

        // MongoDB aggregate query for filtered/sorted/paginated fleet yachts
        let aggregatedPaginatedYachtsData: FormattedFleetYacht[] = [];
        let totalPages = 1;
        let totalDocs = 0;

        if (displayMode === 'all') {
            try {
                // Build $match stage for filtering
                const matchConditions: Record<
                    string,
                    | string
                    | number
                    | Record<string, unknown>
                    | Record<string, unknown>[]
                > = {
                    taxonomyType: 'fleet',
                    _status: 'published',
                };

                if (yearMin !== undefined || yearMax !== undefined) {
                    matchConditions['taxonomyData.fleet.deVoogtData.year'] = {
                        ...(yearMin !== undefined && { $gte: yearMin }),
                        ...(yearMax !== undefined && { $lte: yearMax }),
                    };
                }

                if (lengthMin !== undefined || lengthMax !== undefined) {
                    matchConditions['taxonomyData.fleet.deVoogtData.length'] = {
                        ...(lengthMin !== undefined && { $gte: lengthMin }),
                        ...(lengthMax !== undefined && { $lte: lengthMax }),
                    };
                }

                if (search) {
                    matchConditions.$or = [
                        { title: { $regex: search, $options: 'i' } },
                        {
                            'taxonomyData.fleet.deVoogtData.current_name': {
                                $regex: search,
                                $options: 'i',
                            },
                        },
                        {
                            'taxonomyData.fleet.deVoogtData.launch_name': {
                                $regex: search,
                                $options: 'i',
                            },
                        },
                        {
                            'taxonomyData.fleet.deVoogtData.previous_names': {
                                $regex: search,
                                $options: 'i',
                            },
                        },
                        {
                            'taxonomyData.fleet.deVoogtData.builder': {
                                $regex: search,
                                $options: 'i',
                            },
                        },
                        {
                            'taxonomyData.fleet.deVoogtData.architect': {
                                $regex: search,
                                $options: 'i',
                            },
                        },
                        {
                            'taxonomyData.fleet.deVoogtData.exteriordesign': {
                                $regex: search,
                                $options: 'i',
                            },
                        },
                        {
                            'taxonomyData.fleet.deVoogtData.interiordesign': {
                                $regex: search,
                                $options: 'i',
                            },
                        },
                    ];

                    // If search is a number, also search hull number field
                    const searchAsNumber = Number.parseInt(search, 10);
                    if (!Number.isNaN(searchAsNumber)) {
                        matchConditions.$or.push({
                            'taxonomyData.fleet.deVoogtData.hull':
                                searchAsNumber,
                        });
                    }
                }

                payload.logger.info(`${LOG_PREFIX} Match conditions:`);
                payload.logger.info(matchConditions);

                // Build $sort stage from sort parameter
                const sortStage: Record<string, 1 | -1> = {};

                if (sort) {
                    // Check if the sort option starts with "-" for descending
                    const isDescending = sort.startsWith('-');
                    const fieldName = isDescending ? sort.slice(1) : sort;
                    const direction: 1 | -1 = isDescending ? -1 : 1;

                    switch (fieldName) {
                        case 'name':
                            sortStage.title = direction;
                            break;
                        default:
                            sortStage[
                                `taxonomyData.fleet.deVoogtData.${fieldName}`
                            ] = direction;
                    }
                } else {
                    // Default sort: year descending, then name ascending
                    sortStage['taxonomyData.fleet.deVoogtData.year'] = -1;
                    sortStage.title = 1;
                }

                payload.logger.info(`${LOG_PREFIX} Sort stage:`);
                payload.logger.info(sortStage);

                // MongoDB aggregate with $facet for pagination
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
                                    { $project: { _id: 1 } }, // Only get IDs for now
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

                // Fetch full Payload documents by IDs to get all relationships/fields
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
                    });

                    // Maintain sort order from aggregate by mapping IDs

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
                            formatFleetYacht(
                                page as PageWithGenericTaxonomies<'fleet'>,
                            ),
                        )
                        .filter(
                            (
                                x: FormattedFleetYacht | null,
                            ): x is FormattedFleetYacht => x != null,
                        );
                }
            } catch (error) {
                Sentry.captureException(error, {
                    tags: {
                        component: 'fleet-overview',
                        operation: 'mongodb-aggregate-pagination',
                    },
                    extra: {
                        paginationPage,
                        sort,
                        search,
                        displayMode,
                        yearMin,
                        yearMax,
                        lengthMin,
                        lengthMax,
                    },
                });

                console.error(
                    'Error fetching fleet yachts with aggregates:',
                    error,
                );

                // Fallback to empty results on error
                aggregatedPaginatedYachtsData = [];
                totalPages = 1;
                totalDocs = 0;
            }
        }

        const formattedSpotlightYachtsData: FormattedFleetYacht[] =
            block.spotlightItems
                ?.filter(
                    (
                        spotlightPage,
                    ): spotlightPage is PageWithGenericTaxonomies<'fleet'> =>
                        typeof spotlightPage === 'object' &&
                        spotlightPage.taxonomyType === 'fleet',
                )
                .map((spotlightPage) => formatFleetYacht(spotlightPage))
                .filter(
                    (yacht): yacht is FormattedFleetYacht => yacht !== null,
                ) ?? [];

        return (
            <FleetOverviewClient
                displayMode={displayMode}
                layoutMode={layoutMode}
            >
                {displayMode === 'spotlight' && (
                    <FleetOverviewSpotlight
                        {...block}
                        items={formattedSpotlightYachtsData}
                    />
                )}

                {displayMode === 'all' && (
                    <FleetOverviewAll
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
                )}
            </FleetOverviewClient>
        );
    },
});
