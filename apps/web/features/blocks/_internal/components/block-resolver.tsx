import { componentLoaders } from '@/features/blocks/importMap.components.js';

import {
    type BlocksRegistryNamespace,
    findBlock,
} from '@/features/blocks/_internal/registry';
import type { AnyPageProps } from '@/features/pages/shared';
import type { RouteAlias } from '@/features/payload/local-api/get-route-alias';
import type {
    BlockAppearanceSettings,
    BlockLayoutSettings,
    BlockVisibilitySettings,
    Footer,
    Navigation,
    Page,
} from '@/payload-types';
import { BlockContainer } from './block-container';
import { BlockErrorBoundary } from './error-boundary';

export type BlockResolverProps = {
    namespace: BlocksRegistryNamespace;
    block:
        | {
              id?: string | null;
              blockType?: string | null;
              layout?: BlockLayoutSettings;
              appearance?: BlockAppearanceSettings;
              visibility?: BlockVisibilitySettings;
          }
        | Navigation
        | Footer;
    pageProps: AnyPageProps;
    page: Page;
    routeAlias: RouteAlias | null;
};

/**
 * BlockResolver is responsible for dynamically rendering content blocks based on their type.
 * It handles:
 * - Looking up block configurations from the registry
 * - Loading any extra data needed for the block
 * - Wrapping blocks with error boundaries and layout containers
 * - Passing through page props and block settings
 *
 * @param props.namespace - Registry namespace to look up block config ('blocks', 'global', etc)
 * @param props.block - Block data
 * @param props.pageProps - NextJS page props
 * @returns The rendered block wrapped in container components, or null if invalid
 */
export async function BlockResolver({
    namespace,
    block,
    pageProps,
    page,
    routeAlias,
}: BlockResolverProps) {
    const slug = (
        'blockType' in block
            ? block.blockType
            : 'globalType' in block
              ? block.globalType
              : null
    ) as string | null | undefined;

    // Skip invalid blocks with no type
    if (!slug) return null;

    // Lazy-load the component module (triggers defineBlockComponent() side-effect)
    const loader = componentLoaders[slug as keyof typeof componentLoaders];
    if (loader) await loader();

    // Look up the block's configuration from the registry
    const blockConfig = findBlock(namespace, slug);

    // Skip if no config found for this block type
    if (!blockConfig) return null;

    const params = await pageProps.params;
    const blockNode = blockConfig.component ? (
        <blockConfig.component {...{ block, pageProps, page, routeAlias }} />
    ) : null;

    return (
        <BlockErrorBoundary identifier={slug} namespace={namespace}>
            {'blockType' in block ? (
                <BlockContainer
                    id={block.id}
                    locale={params.locale}
                    layout={block.layout}
                    appearance={block.appearance}
                    visibility={block.visibility}
                    defaultAttributes={blockConfig.defaultAttributes}
                >
                    {blockNode}
                </BlockContainer>
            ) : (
                blockNode
            )}
        </BlockErrorBoundary>
    );
}
