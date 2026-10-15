import type { AnyPageProps } from '@/features/pages/shared';
import type { Footer, Navigation } from '@/payload-types';
import type { Page } from '@/payload-types';

export type BlocksRegistryNamespace = 'blocks' | 'global';

// biome-ignore lint/suspicious/noExplicitAny: shut up de fuk
const store = new Map<string, Config<any, any>>();

export const blocksRegistry = Object.freeze({
    createKey(namespace: BlocksRegistryNamespace, identifier: string) {
        return `${namespace}/${identifier}`;
    },

    parseKey(key: `${BlocksRegistryNamespace}/${string}`) {
        const [namespace, identifier] = key.split('/');
        return { namespace, identifier };
    },

    findBlock(namespace: BlocksRegistryNamespace, identifier: string) {
        return store.get(this.createKey(namespace, identifier));
    },

    addBlock<TSlug extends string, TExtra = void>(
        slug: TSlug,
        config: Config<
            Extract<NonNullable<Page['blocks']>[number], { blockType: TSlug }>,
            TExtra
        >,
    ) {
        store.set(this.createKey('blocks', slug), config);
    },

    addNavigation<TExtra = void>(config: Config<Navigation, TExtra>): void {
        store.set(this.createKey('global', 'navigation'), config);
    },

    addFooter<TExtra = void>(config: Config<Footer, TExtra>): void {
        store.set(this.createKey('global', 'footer'), config);
    },
});

type Config<TPayloadBlock, TExtra = never> = {
    /**
     * @deprecated use async `component` instead
     */
    extra?(params: {
        block: TPayloadBlock;
        pageProps: AnyPageProps;
    }): Promise<TExtra | null | undefined>;
    component: BlockComponentType<TPayloadBlock, Awaited<TExtra>>;
    className?: string;
};

export type BlockComponentType<TBlockData, TExtra> = (
    props: TExtra extends void
        ? {
              block: TBlockData;
              page: Page;
              pageProps: AnyPageProps;
          }
        : {
              block: TBlockData;
              page: Page;
              pageProps: AnyPageProps;
              extra: TExtra;
          },
) => React.ReactNode;
