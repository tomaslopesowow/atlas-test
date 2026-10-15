import { PageBlocks } from '@/features/blocks/_internal/components/page-blocks';
import type { Page } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentPageProps = {
    page: Page;
    pageProps: AnyPageProps;
    pageBlocks: Page['blocks'];
};

export async function ContentPage({
    page,
    pageProps,
    pageBlocks = page.blocks,
}: ContentPageProps) {
    return <PageBlocks blocks={pageBlocks} page={page} pageProps={pageProps} />;
}
