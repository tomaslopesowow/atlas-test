import { BlockResolver } from '@/features/blocks/_internal/components/block-resolver';
import type { PublicPage } from '@/features/payload/local-api/page/get-page.types';
import type { Navigation } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentNavigationProps = {
    page: PublicPage;
    pageProps: AnyPageProps;
    navigation?: Navigation | null;
};

export const ContentNavigation = ({
    page,
    pageProps,
    navigation,
}: ContentNavigationProps) => {
    if (!navigation) return null;
    return (
        <BlockResolver
            namespace="global"
            block={navigation}
            page={page}
            pageProps={pageProps}
        />
    );
};
