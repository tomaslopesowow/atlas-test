import { BlockResolver } from '@/features/blocks/_internal/components/block-resolver';
import type { RouteAlias } from '@/features/payload/local-api/get-route-alias';
import type { Footer, Page } from '@/payload-types';
import type { AnyPageProps } from '../shared';

export type ContentFooterProps = {
    footer?: Footer | null;
    page: Page;
    pageProps: AnyPageProps;
    routeAlias: RouteAlias | null;
};

export const ContentFooter = ({
    page,
    pageProps,
    footer,
    routeAlias,
}: ContentFooterProps) => {
    if (!footer) return null;

    return (
        <div className="content-footer">
            <BlockResolver
                block={footer}
                namespace="global"
                page={page}
                pageProps={pageProps}
                routeAlias={routeAlias}
            />
        </div>
    );
};
