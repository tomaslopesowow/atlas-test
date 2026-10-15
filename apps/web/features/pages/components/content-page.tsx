import { PageBlocks } from '@/features/blocks/components/page-blocks';
import type { Page, PageTemplate } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentPageProps = {
    page: Page;
    pageProps: AnyPageProps;
};

export function ContentPage({ page, pageProps }: ContentPageProps) {
    const pageBlocks = page.blocks ?? [];
    const pageTemplate = (page.template as PageTemplate) ?? {};
    let { beforeContentBlocks, afterContentBlocks } = pageTemplate;
    beforeContentBlocks ??= [];
    afterContentBlocks ??= [];

    return (
        <PageBlocks
            blocks={[
                ...beforeContentBlocks,
                ...pageBlocks,
                ...afterContentBlocks,
            ]}
            page={page}
            pageProps={pageProps}
        />
    );
}
