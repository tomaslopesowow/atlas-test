import { createBlock } from '../utils/create-block';

export const RelatedProducts = createBlock({
    slug: 'related-products',
    imageURL: '/admin-assets/block-thumbnails/related-products.png',
    labels: {
        singular: 'Related products',
        plural: 'Related products',
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                ({
                    en: 'Related Products',
                    nl: 'Gerelateerde Producten',
                })[locale ?? 'en'],
        },
    ],
});
