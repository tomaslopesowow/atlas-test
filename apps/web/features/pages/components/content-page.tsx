import { PageBlocks } from '@/features/blocks/_internal/components/page-blocks';
import type { PublicPage } from '@/features/payload/local-api/page/get-page.types';
import type { AnyPageProps } from '../shared';

export type ContentPageProps = {
    page: PublicPage;
    pageProps: AnyPageProps;
    pageBlocks: PublicPage['blocks'];
};

export async function ContentPage({
    page,
    pageProps,
    pageBlocks = page.blocks,
}: ContentPageProps) {
    return <PageBlocks blocks={pageBlocks} page={page} pageProps={pageProps} />;
}
