import type { Block } from 'payload';
import type { HTMLAttributes, ReactNode } from 'react';

export interface ShopifyBlockPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
    params: Promise<Record<string, string | string[] | undefined>>;
}

export interface ShopifyBlockComponentProps {
    // biome-ignore lint/suspicious/noExplicitAny: block data is typed by the app's generated types at the registration site
    block: any;
    // biome-ignore lint/suspicious/noExplicitAny: page is typed by the app's generated types at the registration site
    page: any;
    pageProps: ShopifyBlockPageProps;
}

export interface ShopifyBlockConfig {
    block: Omit<Block, 'slug' | 'imageURL'> & {
        slug: string;
        imageURL: string;
    };
    component: (
        props: ShopifyBlockComponentProps,
    ) => ReactNode | Promise<ReactNode>;
    defaultAttributes?: HTMLAttributes<HTMLElement>;
    includeSettings?: string[];
}
