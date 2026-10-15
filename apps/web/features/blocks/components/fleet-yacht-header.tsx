import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { notFound } from 'next/navigation';
import { Yacht } from '@/features/payload/features/devoogt/utils/devoogtdb-client';
import { Option, pipe, Schema } from 'effect';
import { getPayloadClient } from '../../payload/client';
import { getSettings } from '../../payload/local-api/get-settings';
import { asDoc } from '../../payload/utils/as-doc';
import { BlockResolver } from '../_internal/components/block-resolver';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import { YachtHeader } from '@/components/common/yacht-header';
import { getTranslations } from 'next-intl/server';

defineBlockComponent({
    slug: 'fleet-yacht-header',
    component: async ({ page, pageProps, routeAlias }) => {
        if (!isAllowedPageTaxonomy(page, ['fleet'])) notFound();

        const [payload, t] = await Promise.all([
            getPayloadClient(),
            getTranslations('YachtDetail'),
        ]);

        const refitPage = await getSettings().then((settings) =>
            asDoc(settings?.pages?.refit),
        );

        const isRefitPage =
            !!refitPage &&
            !!routeAlias?.source.id &&
            refitPage.id === routeAlias.source.id;

        const LOG_PREFIX = '[fleet-yacht-header]';
        payload.logger.info(`${LOG_PREFIX} isRefitPage: ${isRefitPage}`);

        // Read yacht data from cached deVoogtData (SWR pattern)
        // Background refresh is triggered automatically via field afterRead hook when stale
        const yachtData = pipe(
            Schema.decodeUnknownOption(Yacht)(
                page.taxonomyData?.fleet?.deVoogtData,
            ),
            Option.getOrNull,
        );

        if (!yachtData) notFound();

        const isTransition = await pageProps.searchParams.then(
            ({ tr }) => tr === '1',
        );

        return (
            <>
                <YachtHeader
                    title={page.title}
                    about={page.taxonomyData.fleet?.about}
                    cover={{
                        type: 'image',
                        image: page.taxonomyData.fleet?.cover,
                    }}
                    hull={yachtData.hull}
                    length={yachtData.readable_length}
                    year={yachtData.year}
                    isTransition={isTransition}
                    statistics={[
                        [t('hull'), yachtData.hull],
                        [t('length'), yachtData.readable_length],
                        [t('year'), yachtData.year],
                    ]}
                />

                {isRefitPage &&
                    page.taxonomyData?.fleet?.refitContent?.map(
                        (block, index) => {
                            if (!block.blockType) return null;

                            return (
                                <BlockResolver
                                    key={[block.blockType, index].join('-')}
                                    namespace="blocks"
                                    block={block}
                                    page={page}
                                    pageProps={pageProps}
                                    routeAlias={routeAlias}
                                />
                            );
                        },
                    )}
            </>
        );
    },
});
