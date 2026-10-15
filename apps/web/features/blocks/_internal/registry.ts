import camelCase from 'lodash.camelcase';
import type {
    Block,
    BlockSlug,
    Field,
    GlobalConfig as PayloadGlobalConfig,
    TypedBlock,
} from 'payload';
import type { AnyPageProps } from '@/features/pages/shared';
import type { RouteAlias } from '@/features/payload/local-api/get-route-alias';
import {
    createBlockSettingsField,
    type SettingType,
} from '@/features/payload/fields/block-settings';
import type { Page } from '@/payload-types';

export type BlocksRegistryNamespace = 'blocks' | 'global';

// --- Internal stores ---

const configStore = new Map<
    string,
    { block: Block | PayloadGlobalConfig | GlobalBlockDef }
>();
const componentStore = new Map<
    string,
    {
        // biome-ignore lint/suspicious/noExplicitAny: allow any for generic registry
        component: BlockComponentType<any>;
        defaultAttributes?: React.HTMLAttributes<HTMLElement>;
    }
>();

// --- Key helpers ---

function createKey(namespace: BlocksRegistryNamespace, identifier: string) {
    return `${namespace}/${identifier}`;
}

function parseKey(key: `${BlocksRegistryNamespace}/${string}`) {
    const [namespace, identifier] = key.split('/');
    return { namespace, identifier };
}

// --- Config registration (used by configs/*.ts) ---

type ConstrainedPayloadBlock<TSlug extends string> = Omit<
    Block,
    'slug' | 'imageURL'
> & {
    slug: TSlug;
    imageURL: string;
};

export function defineBlockConfig<TSlug extends string>(config: {
    block: ConstrainedPayloadBlock<TSlug>;
    includeSettings?: SettingType[];
    withSettings?: boolean;
}): void {
    const fields: Field[] = [...config.block.fields];

    if (config.withSettings ?? true) {
        fields.push(createBlockSettingsField(config.includeSettings));
    }

    configStore.set(createKey('blocks', config.block.slug), {
        block: {
            ...config.block,
            interfaceName: camelCase(
                config.block.interfaceName || config.block.slug,
            ),
            fields,
        } satisfies Block,
    });
}

export function defineNavigationConfig(config: {
    block: PayloadGlobalConfig;
}): void {
    configStore.set(createKey('global', config.block.slug), {
        block: config.block,
    });
}

interface GlobalBlockDef {
    slug: string;
    label: string;
    fields: Field[];
}

export function defineFooterConfig(config: { block: GlobalBlockDef }): void {
    configStore.set(createKey('global', config.block.slug), {
        block: config.block,
    });
}

// --- Component registration (used by components/*.tsx) ---

export function defineBlockComponent<TSlug extends BlockSlug>(config: {
    slug: TSlug;
    component: BlockComponentType<TypedBlock[TSlug]>;
    defaultAttributes?: React.HTMLAttributes<HTMLElement>;
}): void {
    componentStore.set(createKey('blocks', config.slug), {
        component: config.component,
        defaultAttributes: config.defaultAttributes,
    });
}

export function defineNavigationComponent<T>(config: {
    component: BlockComponentType<T>;
}): void {
    componentStore.set(createKey('global', 'navigation'), {
        component: config.component,
    });
}

export function defineFooterComponent<T>(config: {
    component: BlockComponentType<T>;
}): void {
    componentStore.set(createKey('global', 'footer'), {
        component: config.component,
    });
}

// --- Lookup functions ---

export function findBlock(
    namespace: BlocksRegistryNamespace,
    identifier: string,
) {
    const config = configStore.get(createKey(namespace, identifier));
    const comp = componentStore.get(createKey(namespace, identifier));
    if (!config && !comp) return undefined;
    return {
        block: config?.block,
        component: comp?.component,
        defaultAttributes: comp?.defaultAttributes,
    };
}

export function findBlockConfigs(namespace: BlocksRegistryNamespace) {
    const entries: { block: Block | PayloadGlobalConfig | GlobalBlockDef }[] =
        [];

    configStore.forEach((value, key) => {
        const { namespace: entryNamespace } = parseKey(
            key as `${BlocksRegistryNamespace}/${string}`,
        );
        if (entryNamespace === namespace) {
            entries.push(value);
        }
    });

    return entries;
}

export type BlockComponentType<TBlockData> = (props: {
    block: TBlockData;
    page: Page;
    pageProps: AnyPageProps;
    routeAlias: RouteAlias | null;
}) => React.ReactNode;
