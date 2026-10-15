import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { SkipLink } from '@/components/common/skip-link';
import { SmoothScrollProvider } from '@/features/animation/components/smooth-scroll-context';
import { ContentFooter } from '@/features/pages/components/content-footer';
import { RefreshRouteOnSave } from '@/features/pages/components/content-live-preview';
import { ContentNavigation } from '@/features/pages/components/content-navigation';
import { ContentPage } from '@/features/pages/components/content-page';
import { getPageMetadata } from '@/features/pages/metadata/metadata';
import type { AnyPageProps } from '@/features/pages/shared';
import { parsePagePathname } from '@/features/pages/utils/parse-page-pathname';
import { getFooter } from '@/features/payload/local-api/get-footer';
import { getNavigation } from '@/features/payload/local-api/get-navigation';
import { getPageTemplate } from '@/features/payload/local-api/get-page-template';
import { getRedirectsByPath } from '@/features/payload/local-api/get-redirects';
import { ProductProvider } from '@/features/shopify/components/product-context';
import type { Footer, Navigation } from '@/payload-types';
import { getSiteUrl } from '@/utils/get-site-url';
import 'lenis/dist/lenis.css';
import { getPageByPath } from '@/features/payload/local-api/page/get-page';

export const generateMetadata = getPageMetadata;

export default async function Page(props: AnyPageProps) {
    const [params, searchParams, siteUrl] = await Promise.all([
        props.params,
        props.searchParams,
        getSiteUrl(),
    ] as const);

    const isPreview = searchParams.preview === 'true';
    const pathname = parsePagePathname(params);

    const [, navigation, page, footer] = await Promise.all([
        getRedirectsByPath(pathname),
        getNavigation(),
        getPageByPath(pathname, isPreview),
        getFooter(),
    ] as const);

    if (!page) notFound();

    const blocks = [...(page.blocks ?? [])];

    if (page.taxonomyType) {
        const {
            docs: [pageTemplate],
        } = await getPageTemplate(page.taxonomyType);

        blocks.unshift(...(pageTemplate?.beforeContentBlocks ?? []));
        blocks.push(...(pageTemplate?.afterContentBlocks ?? []));
    }

    const node = (
        <Fragment>
            <SkipLink />
            {isPreview && <RefreshRouteOnSave serverURL={siteUrl} />}

            <div id="main-navigation" tabIndex={-1}>
                <ContentNavigation
                    page={page}
                    pageProps={props}
                    navigation={navigation as Navigation}
                />
            </div>

            <main
                id="main-content"
                tabIndex={-1}
                className="flex-1 pt-[var(--main-nav-height)]"
            >
                <ContentPage
                    page={page}
                    pageBlocks={blocks}
                    pageProps={props}
                />
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

    return <SmoothScrollProvider>{node}</SmoothScrollProvider>;
}
