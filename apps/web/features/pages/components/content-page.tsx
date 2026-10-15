import { PageBlocks } from '@/features/blocks/_internal/components/page-blocks';
import type { RouteAlias } from '@/features/payload/local-api/get-route-alias';
import type { Page, PageTemplate } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentPageProps = {
    page: Page;
    pageProps: AnyPageProps;
    routeAlias: RouteAlias | null;
};

export function ContentPage({ page, pageProps, routeAlias }: ContentPageProps) {
    const pageBlocks = page.blocks ?? [];
    const pageTemplate = (page.template as PageTemplate) ?? {};
    let {
        beforeContentBlocks,
        afterContentBlocks,
        pageContentBlocks = true,
    } = pageTemplate;
    beforeContentBlocks ??= [];
    afterContentBlocks ??= [];

    return (
        <PageBlocks
            blocks={[
                ...beforeContentBlocks,
                ...(pageContentBlocks ? pageBlocks : []),
                ...afterContentBlocks,
            ]}
            page={page}
            pageProps={pageProps}
            routeAlias={routeAlias}
        />
    );
}
