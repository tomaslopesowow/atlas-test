import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createImageField } from '../../payload/fields/image';
import { createLinkField } from '../../payload/fields/link';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';

defineBlockConfig({
    block: {
        slug: 'sticky-scroll-content',
        imageURL: '/admin-assets/block-thumbnails/sticky-scroll-content.png',
        fields: [
            {
                name: 'prependTitle',
                type: 'text',
                localized: true,
                admin: {
                    description:
                        'This will be displayed before all the items` titles.',
                },
            },
            {
                name: 'items',
                type: 'array',
                fields: [
                    {
                        name: 'title',
                        type: 'text',
                        localized: true,
                    },
                    createImageField(),
                    createSimpleRichTextField(),
                    createLinkField(),
                ],
            },
        ],
    },
});
