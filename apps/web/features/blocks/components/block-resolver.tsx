import 'server-only';

import type { AnyPageProps } from '@/features/pages/shared';
import type {
    BlockAppearanceSettings,
    BlockLayoutSettings,
    BlockVisibilitySettings,
    Footer,
    Navigation,
    Page,
} from '@/payload-types';
import { type BlocksRegistryNamespace, blocksRegistry } from '../registry';
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

    // Look up the block's configuration from the registry
    const blockConfig = blocksRegistry.findBlock(namespace, slug);

    // Skip if no config found for this block type
    if (!blockConfig) return null;

    // Load page params and any extra block data in parallel
    const [params, extra] = await Promise.all([
        pageProps.params,
        blockConfig.extra?.({
            block,
            pageProps,
        }),
    ]);

    const blockNode = (
        <blockConfig.component {...{ block, extra, pageProps, page }} />
    );

    return (
        <BlockErrorBoundary identifier={slug} namespace={namespace}>
            {'blockType' in block ? (
                <BlockContainer
                    locale={params.locale}
                    layout={block.layout}
                    appearance={block.appearance}
                    visibility={block.visibility}
                    className={blockConfig.className}
                >
                    {blockNode}
                </BlockContainer>
            ) : (
                blockNode
            )}
        </BlockErrorBoundary>
    );
}
