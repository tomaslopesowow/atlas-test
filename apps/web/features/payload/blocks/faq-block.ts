import { createBlock } from '../utils/create-block';

export const FaqBlock = createBlock({
    slug: 'faq-block',
    imageURL: '/admin-assets/block-thumbnails/faq-block.png',
    labels: {
        singular: 'FAQ Block',
        plural: 'FAQ Blocks',
    },
    fields: [
        {
            name: 'sectionTitle',
            type: 'text',
            localized: true,
        },
        {
            name: 'title',
            type: 'text',
            localized: true,
        },
        {
            name: 'text',
            type: 'textarea',
            localized: true,
        },
        {
            name: 'faqs',
            relationTo: 'faq',
            hasMany: true,
            type: 'relationship',
            admin: {
                isSortable: true,
            },
        },
    ],
});
