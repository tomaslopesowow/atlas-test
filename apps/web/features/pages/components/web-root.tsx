import { isbot } from 'isbot';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { LoadScreen } from '@/features/animation/components/load-screen';
import { LoaderProvider } from '@/features/animation/components/loader-context';
import { AudioProvider } from '@/features/contexts/audio-context';
import { getFooter } from '@/features/payload/local-api/get-footer';
import { getNavigation } from '@/features/payload/local-api/get-navigation';
import { getPageByPath } from '@/features/payload/local-api/get-page';
import { getRedirectsByPath } from '@/features/payload/local-api/get-redirects';
import { getRouteAlias } from '@/features/payload/local-api/get-route-alias';
import { SkipLink } from '@/features/shadcn/ui/skip-link';
import { ProductProvider } from '@/features/shopify/components/product-context';
import type { Footer, Media, Navigation } from '@/payload-types';
import { getSiteUrl } from '@/utils/get-site-url';
import type { AnyPageProps } from '../shared';
import { parsePagePathname } from '../utils/parse-page-pathname';
import { ContentFooter } from './content-footer';
import { RefreshRouteOnSave } from './content-live-preview';
import { ContentNavigation } from './content-navigation';
import { ContentPage } from './content-page';
import { ScrollProgressIndicator } from '@/components/common/scroll-progress-indicator';
import { cn } from '@/features/shadcn/utils/ui';
import { SmoothScrollProvider } from '@/features/animation/components/smooth-scroll-context';
import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import Icon from '@/components/icons/icon';
import { asDoc } from '@/features/payload/utils/as-doc';
import { Fragment } from 'react/jsx-runtime';
import { findBlock } from '@/features/blocks/_internal/registry';

export async function WebAppRoot(props: AnyPageProps) {
    // Await params and headers in parallel
    const [params, searchParams, siteUrl, userAgent] = await Promise.all([
        props.params,
        props.searchParams,
        getSiteUrl(),
        headers().then((headers) => headers.get('user-agent')),
    ] as const);

    const isPreview = searchParams.preview === 'true';
    const pathname = parsePagePathname(params);
    const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);
    const isBot = isbot(userAgent);

    // Check for route alias first
    const routeAlias = await getRouteAlias(pathnameWithoutLocale);

    // Use resolved path if alias exists, otherwise use original pathname
    const pagePath = routeAlias ? routeAlias.resolvedPath : pathname;
    const isPathWithoutLocale = !!routeAlias;

    // Await all requests in parallel
    const [, navigation, page, footer] = await Promise.all([
        getRedirectsByPath(pathname),
        getNavigation(),
        getPageByPath(pagePath, { isDraft: isPreview, isPathWithoutLocale }),
        getFooter(),
    ] as const);

    if (!page) notFound();

    const pageBlocks = page.blocks ?? [];
    const pageTemplate = asDoc(page.template);

    const blocks = [
        ...(pageTemplate?.beforeContentBlocks ?? []),
        ...pageBlocks,
        ...(pageTemplate?.afterContentBlocks ?? []),
    ];

    const firstBlock = blocks?.[0];
    const firstBlockIsDark =
        firstBlock &&
        'appearance' in firstBlock &&
        firstBlock.appearance?.theme === 'dark';

    const enableLoader = page?.enableLoader;
    // TODO: change blockType name to video decoder block when available
    // TODO: send decoder progress to loader, see instructions at loader-context.tsx.
    const firstBlockIsDecoder = page?.blocks?.[0]?.blockType === 'cookie-table';

    let node = (
        <div
            className={cn(
                'text-primary bg-primary transition-[background-color] [&>*]:transition-none duration-700 [&>*]:duration-0',
                firstBlockIsDark && 'dark',
            )}
            id="theme-root"
        >
            <SkipLink />
            {page.progressIndicator?.enabled && (
                <ScrollProgressIndicator
                    className="fixed bottom-10 right-10 hidden lg:flex"
                    content={<Icon name={page.progressIndicator.icon} />}
                />
            )}
            {isPreview && <RefreshRouteOnSave serverURL={siteUrl} />}

            <div id="main-navigation" tabIndex={-1}>
                <ContentNavigation
                    page={page}
                    pageProps={props}
                    navigation={navigation as Navigation}
                    routeAlias={routeAlias}
                />
            </div>

            <main id="main-content" tabIndex={-1} className="flex-1">
                <ContentPage
                    page={page}
                    pageProps={props}
                    routeAlias={routeAlias}
                />
            </main>

            <ContentFooter
                page={page}
                pageProps={props}
                footer={footer as Footer}
                routeAlias={routeAlias}
            />
        </div>
    );

    if (process.env.NEXT_PUBLIC_ECOMMERCE === 'yes') {
        return <ProductProvider page={page}>{node}</ProductProvider>;
    }

    // Check if any block requires WebGL by checking the block config `custom.webgl`
    const requiresWebGL = blocks.some((block) => {
        const blockConfig = findBlock('blocks', block.blockType);
        return (
            blockConfig?.block &&
            'custom' in blockConfig.block &&
            !!blockConfig.block?.custom?.webgl
        );
    });

    if (requiresWebGL) {
        node = (
            <Fragment>
                {node}
                <canvas id="webgl-portal" className="fixed size-full inset-0" />
            </Fragment>
        );
    }

    return (
        <SmoothScrollProvider>
            <LoaderProvider enableFakeLoader={!firstBlockIsDecoder}>
                <AudioProvider
                    backgroundSound={page?.backgroundSound as Media | null}
                >
                    {!isBot && enableLoader && <LoadScreen />}
                    {node}
                </AudioProvider>
            </LoaderProvider>
        </SmoothScrollProvider>
    );
}
