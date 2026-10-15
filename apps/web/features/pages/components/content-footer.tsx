import { BlockResolver } from '@/features/blocks/_internal/components/block-resolver';
import type { PublicPage } from '@/features/payload/local-api/page/get-page.types';
import type { Footer } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentFooterProps = {
    footer?: Footer | null;
    page: PublicPage;
    pageProps: AnyPageProps;
};

export const ContentFooter = ({
    page,
    pageProps,
    footer,
}: ContentFooterProps) => {
    if (!footer) return null;
    return (
        <BlockResolver
            block={footer}
            namespace="global"
            page={page}
            pageProps={pageProps}
        />
    );
};
