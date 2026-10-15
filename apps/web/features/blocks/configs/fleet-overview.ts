import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';

defineBlockConfig({
    block: {
        // TODO: enable this in the future
        // When we can properly use the webgl canvas portal
        // custom: {
        //     webgl: true,
        // },

        slug: 'fleet-overview',
        imageURL: '/admin-assets/block-thumbnails/fleet-overview.png',
        fields: [
            createSimpleRichTextField({
                name: 'title',
            }),
            {
                name: 'spotlightItems',
                type: 'relationship',
                hasMany: true,
                maxRows: 9,
                relationTo: 'pages',
                filterOptions: {
                    taxonomyType: {
                        equals: 'fleet',
                    },
                },
            },
        ],
    },
});
