import { BlockResolver } from '@/features/blocks/components/block-resolver';
import type { Footer, Page } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentFooterProps = {
    footer?: Footer | null;
    page: Page;
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
