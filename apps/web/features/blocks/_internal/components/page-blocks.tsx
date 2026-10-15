import 'server-only';

import type { AnyPageProps } from '@/features/pages/shared';
import type { RouteAlias } from '@/features/payload/local-api/get-route-alias';
import type { Page } from '@/payload-types';
import { BlockResolver } from './block-resolver';

export type BlocksContentProps = {
    blocks: Page['blocks'];
    pageProps: AnyPageProps;
    page: Page;
    routeAlias: RouteAlias | null;
};

/**
 * PageBlocks is a component that renders a list of content blocks for a page.
 * It maps through the blocks array and renders each block using BlockResolver.
 *
 * @param props.pageProps - Props containing page-level data and configuration
 * @param props.blocks - Array of block objects from the page content
 * @returns A flex column container with the resolved blocks
 *
 * Each block is wrapped in a `BlockResolver` component which:
 * - Handles block resolution and rendering based on block type
 * - Provides block settings like layout and appearance
 * - Manages error boundaries for individual blocks
 * - Passes through page props to each block
 */
export const PageBlocks = ({
    pageProps,
    blocks,
    page,
    routeAlias,
}: BlocksContentProps) => {
    const { navigationInset } = page;
    return (
        <div
            className="flex flex-col"
            id="blocks"
            style={{
                marginTop: !navigationInset ? 'var(--navigation-height)' : 0,
            }}
        >
            {blocks?.map((block, index) => {
                if (!block.blockType) return null;

                return (
                    <BlockResolver
                        key={[block.blockType, index].join('-')}
                        namespace="blocks"
                        block={block}
                        page={page}
                        pageProps={pageProps}
                        routeAlias={routeAlias}
                    />
                );
            })}
        </div>
    );
};
