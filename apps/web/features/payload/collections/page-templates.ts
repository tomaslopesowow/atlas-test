import type { PageTemplate } from '@/payload-types';
import type { CollectionConfig } from 'payload';
import { allBlocks } from '../blocks/all';
import { userHasPermission } from '../features/permission-based-access/utils/find-user-permission';

export const PageTemplates: CollectionConfig = {
    slug: 'page-templates',

    admin: {
        useAsTitle: 'title',
    },

    access: {
        delete: ({ req, data }) => {
            // Disallow operation if default template
            if (isDefaultPageTemplate(data?.title)) return false;

            return userHasPermission(
                req.user,
                'collections',
                PageTemplates.slug,
                'delete',
            );
        },
    },

    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
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

    if (process.env.NEXT_PUBLIC_ECOMMERCE === 'yes') {
        templates.push({
            title: 'Product',
            beforeContentBlocks: [
                {
                    blockName: 'Product',
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

const isDefaultPageTemplate = (title: string) =>
    DEFAULT_PAGE_TEMPLATES.some((template) => template.title === title);
