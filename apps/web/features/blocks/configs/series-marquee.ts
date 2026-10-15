import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';

defineBlockConfig({
    block: {
        slug: 'series-marquee',
        imageURL: '/admin-assets/block-thumbnails/series-marquee.png',
        fields: [
            {
                name: 'eyebrow',
                type: 'text',
                localized: true,
            },
            createSimpleRichTextField({ name: 'title' }),
            {
                name: 'items',
                type: 'relationship',
                relationTo: 'pages',
                hasMany: true,
                filterOptions: {
                    taxonomyType: {
                        equals: 'series',
                    },
                },
            },
        ],
    },
});
