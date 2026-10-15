import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { createLinkField } from '@/features/payload/fields/link';
import { getBrand } from '@/features/payload/local-api/get-brand';
import type { Navigation } from '@/payload-types';
import { NavigationClient } from './navigation.client';

blocksRegistry.addNavigation<Navigation>({
    block: {
        slug: 'navigation',

        fields: [
            {
                name: 'mainItems',
                type: 'array',
                fields: [
                    createLinkField(),
                    {
                        name: 'subItems',
                        type: 'array',
                        fields: [createLinkField()],
                    },
                ],
            },
            {
                name: 'featuredItems',
                type: 'array',
                fields: [
                    createLinkField(),
                    {
                        name: 'variant',
                        type: 'select',
                        options: ['default', 'primary'],
                        defaultValue: 'default',
                    },
                ],
            },
        ],
    },

    component: async ({ block }) => {
        const brand = await getBrand();
        return <NavigationClient {...block} brand={brand} />;
    },
});
