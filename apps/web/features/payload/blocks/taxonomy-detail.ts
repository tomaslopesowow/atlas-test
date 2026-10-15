import { createBlock } from '../utils/create-block';

export const TaxonomyDetail = createBlock({
    slug: 'taxonomy-detail',
    labels: {
        singular: 'News detail',
        plural: 'News details',
    },
    imageURL: '/admin-assets/block-thumbnails/taxonomy-detail.jpg',
    fields: [
        {
            name: 'content',
            type: 'richText',
            localized: true,
        },
    ],
});
