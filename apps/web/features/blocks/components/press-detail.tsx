import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { BlockResolver } from '../_internal/components/block-resolver';
import { PressDetailClient } from './press-detail.client';

defineBlockComponent({
    slug: 'press-detail',
    component: async ({ page, block, pageProps, routeAlias }) => {
        if (page.taxonomyType !== 'press') {
            return null;
        }

        if (!page.taxonomyData?.press) {
            return null;
        }

        return (
            <PressDetailClient
                pressData={page.taxonomyData.press}
                permalink={page.permalink}
                block={block}
            >
                {page.blocks?.map((childBlock) => (
                    <BlockResolver
                        key={childBlock.id}
                        block={childBlock}
                        namespace="blocks"
                        pageProps={pageProps}
                        page={page}
                        routeAlias={routeAlias}
                    />
                ))}
            </PressDetailClient>
        );
    },
});
