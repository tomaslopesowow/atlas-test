import type { CollectionConfig } from 'payload';
import type { PageTemplate } from '@/payload-types';
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
            name: 'pageContentBlocks',
            type: 'checkbox',
            defaultValue: true,
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

export const FLEET_TEMPLATE_TITLE = 'Fleet Yacht Detail';
export const RESALE_TEMPLATE_TITLE = 'Resale Vessel Detail';
export const NEWS_TEMPLATE_TITLE = 'News Article';
export const PRESS_TEMPLATE_TITLE = 'Press Entry';

export const DEFAULT_PAGE_TEMPLATES: DefaultTemplate[] = (() => {
    const templates: DefaultTemplate[] = [
        {
            title: FLEET_TEMPLATE_TITLE,
            beforeContentBlocks: [
                {
                    blockType: 'fleet-yacht-header',
                },
            ],
            afterContentBlocks: [
                {
                    blockType: 'image-marquee',
                    contextual: true,
                    layout: { width: 'fluid' },
                },
                {
                    blockType: 'yacht-specifications',
                    layout: {
                        paddingTop: '4',
                        paddingBottom: '4',
                    },
                },
                {
                    blockType: 'fleet-yacht-footer',
                    layout: { width: 'fluid' },
                },
            ],
        },
        {
            title: RESALE_TEMPLATE_TITLE,
            beforeContentBlocks: [
                {
                    blockType: 'resale-vessel-header',
                },
            ],
            afterContentBlocks: [
                {
                    blockType: 'yacht-specifications',
                    layout: {
                        paddingTop: '4',
                        paddingBottom: '4',
                    },
                },
                {
                    blockType: 'resale-vessel-footer',
                    layout: {
                        paddingTop: '4',
                        paddingBottom: '4',
                    },
                },
            ],
        },
        {
            title: NEWS_TEMPLATE_TITLE,
            beforeContentBlocks: [
                {
                    blockType: 'article-header',
                },
            ],
            afterContentBlocks: [
                {
                    blockType: 'related-articles-carousel',
                },
            ],
        },
        {
            title: PRESS_TEMPLATE_TITLE,
            beforeContentBlocks: [
                {
                    blockType: 'press-detail',
                },
            ],
            pageContentBlocks: false,
            afterContentBlocks: [
                {
                    blockType: 'related-articles-carousel',
                    title: 'More press releases',
                },
            ],
        },
    ];

    if (process.env.NEXT_PUBLIC_ECOMMERCE === 'yes') {
        templates.push({
            title: 'Product',
            beforeContentBlocks: [
                {
                    blockName: 'Product',
                    // @ts-expect-error - this block is not available when NEXT_PUBLIC_ECOMMERCE is disabled
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
