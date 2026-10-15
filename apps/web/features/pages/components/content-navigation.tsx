import { BlockResolver } from '@/features/blocks/_internal/components/block-resolver';
import type { Navigation, Page } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentNavigationProps = {
    page: Page;
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
