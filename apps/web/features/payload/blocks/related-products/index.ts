import { createBlock } from '../../utils/create-block';
import thumbnail from './image.png';

export const RelatedProducts = createBlock({
    slug: 'related-products',
    labels: {
        singular: 'Related Products',
        plural: 'Related Products',
    },
    imageURL: thumbnail.src,
    fields: [
        {
            name: 'title',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                ({
                    en: 'Related Products',
                })[locale ?? 'en'],
        },
    ],
});
