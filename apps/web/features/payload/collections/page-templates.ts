import type { CollectionConfig } from 'payload';
import type { PageTemplate } from '@/payload-types';
import { allBlocks } from '../blocks/all';
import { taxonomyConfigs } from '../features/taxonomies/taxonomies';

export const PageTemplates: CollectionConfig = {
    slug: 'page-templates',

    admin: {
        useAsTitle: 'title',
    },

    // Restrict access as they are linked to taxonomies
    access: {
        delete: () => false,
        create: () => false,
    },

    fields: [
        {
            name: 'title',
            type: 'text',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'beforeContentBlocks',
            type: 'blocks',
            blocks: allBlocks,
            admin: {
                description:
                    'These content blocks will be shown before the main content of the page.',
            },
        },
        {
            name: 'afterContentBlocks',
            type: 'blocks',
            blocks: allBlocks,
            admin: {
                description:
                    'These content blocks will be shown after the main content of the page.',
            },
        },
    ],
};

type DefaultTemplate = Omit<PageTemplate, 'id' | 'createdAt' | 'updatedAt'>;

export const DEFAULT_PAGE_TEMPLATES: DefaultTemplate[] = (() => {
    const templates: DefaultTemplate[] = [];

    // Create empty template for each taxonomy type
    const taxonomyTypes = Object.keys(taxonomyConfigs);

    for (const taxonomyType of taxonomyTypes) {
        templates.push({
            title: taxonomyType,
            beforeContentBlocks: [],
            afterContentBlocks: [],
        });
    }

    if (process.env.NEXT_PUBLIC_ECOMMERCE === 'yes') {
        templates.push({
            title: 'Product',
            beforeContentBlocks: [
                {
                    blockName: 'Product',
                    // biome-ignore lint/suspicious/noTsIgnore: This can be toggled, so it should always be ignored
                    // @ts-ignore - this block is not available when NEXT_PUBLIC_ECOMMERCE is disabled
                    blockType: 'product-header',
                    layout: {
                        paddingTop: '0',
                    },
                },
            ],
        });
    }

    return templates;
})();
