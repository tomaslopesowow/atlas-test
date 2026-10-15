import '@/components/blocks/importMap';
import { getFooter } from '@/features/payload/local-api/get-footer';
import { getNavigation } from '@/features/payload/local-api/get-navigation';
import { getPageByPath } from '@/features/payload/local-api/get-page';
import { getRedirectsByPath } from '@/features/payload/local-api/get-redirects';
import { ProductProvider } from '@/features/shopify/components/product-context';
import type { Footer, Navigation } from '@/payload-types';
import { getSiteUrl } from '@/utils/get-site-url';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import type { AnyPageProps } from '../shared';
import { parsePagePathname } from '../utils/parse-page-pathname';
import { ContentFooter } from './content-footer';
import { RefreshRouteOnSave } from './content-live-preview';
import { ContentNavigation } from './content-navigation';
import { ContentPage } from './content-page';

export async function WebAppRoot(props: AnyPageProps) {
    // Await params and headers in parallel
    const [params, searchParams, siteUrl] = await Promise.all([
        props.params,
        props.searchParams,
        getSiteUrl(),
    ] as const);

    const isPreview =
        searchParams.preview === 'live' || searchParams.preview === 'draft';
    const pathname = parsePagePathname(params);

    // Await all requests in parallel
    const [, navigation, page, footer] = await Promise.all([
        getRedirectsByPath(pathname),
        getNavigation(),
        getPageByPath(pathname, isPreview),
        getFooter(),
    ] as const);

    if (!page) notFound();

    const node = (
        <Fragment>
            {isPreview && <RefreshRouteOnSave serverURL={siteUrl} />}

            <ContentNavigation
                page={page}
                pageProps={props}
                navigation={navigation as Navigation}
            />

            <main className="flex-1">
                <ContentPage page={page} pageProps={props} />
            </main>

            <ContentFooter
                page={page}
                pageProps={props}
                footer={footer as Footer}
            />
        </Fragment>
    );

    if (process.env.NEXT_PUBLIC_ECOMMERCE === 'yes') {
        return <ProductProvider page={page}>{node}</ProductProvider>;
    }

    return node;
}
