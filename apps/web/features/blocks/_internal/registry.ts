import camelCase from 'lodash.camelcase';
import type { Block, GlobalConfig as PayloadGlobalConfig } from 'payload';
import type { AnyPageProps } from '@/features/pages/shared';
import {
    createBlockSettingsField,
    type SettingType,
} from '@/features/payload/fields/block-settings';
import type { _Blocks, Page } from '@/payload-types';

export type BlocksRegistryNamespace = 'blocks' | 'global';

// biome-ignore lint/suspicious/noExplicitAny: allow any for generic registry
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

    findBlocks(namespace: BlocksRegistryNamespace) {
        const entries: Config<Block, unknown>[] = [];

        store.forEach((value, key) => {
            const { namespace: entryNamespace } = this.parseKey(
                key as `${BlocksRegistryNamespace}/${string}`,
            );
            if (entryNamespace === namespace) {
                entries.push(value);
            }
        });

        return entries;
    },

    addBlock<TSlug extends string>(config: BlockConfig<TSlug>) {
        store.set(this.createKey('blocks', config.block.slug), {
            ...config,
            block: {
                ...config.block,
                interfaceName: camelCase(
                    config.block.interfaceName || config.block.slug,
                ),
                fields: [
                    ...config.block.fields,
                    createBlockSettingsField(config.includeSettings),
                ],
            } satisfies Block,
        });
    },

    addNavigation<TGenerated>(
        config: GlobalConfig<PayloadGlobalConfig, TGenerated>,
    ): void {
        store.set(this.createKey('global', config.block.slug), config);
    },

    addFooter<TGenerated>(
        config: GlobalConfig<PayloadGlobalConfig, TGenerated>,
    ): void {
        store.set(this.createKey('global', config.block.slug), config);
    },
});

interface Config<TBlock, TComponent> {
    block: TBlock;
    component: TComponent;
    defaultAttributes?: React.HTMLAttributes<HTMLElement>;
}

interface GlobalConfig<T, TGenerated>
    extends Config<T, BlockComponentType<TGenerated>> {}

type ConstrainedPayloadBlock<TSlug extends string> = Omit<
    Block,
    'slug' | 'imageURL'
> & {
    slug: TSlug;
    imageURL: string;
};

interface BlockConfig<TSlug extends string>
    extends Config<
        ConstrainedPayloadBlock<TSlug>,
        BlockComponentType<
            Extract<
                NonNullable<_Blocks['blocks']>[number],
                { blockType: TSlug }
            >
        >
    > {
    includeSettings?: SettingType[];
}

export type BlockComponentType<TBlockData> = (props: {
    block: TBlockData;
    page: Page;
    pageProps: AnyPageProps;
}) => React.ReactNode;
