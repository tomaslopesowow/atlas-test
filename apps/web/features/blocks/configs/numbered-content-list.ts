import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';
import { createImageField } from '../../payload/fields/image';
import { createLinkField } from '../../payload/fields/link';

defineBlockConfig({
    block: {
        slug: 'numbered-content-list',
        imageURL: '/admin-assets/block-thumbnails/numbered-content-list.png',
        fields: [
            {
                name: 'items',
                type: 'array',
                fields: [
                    {
                        name: 'title',
                        type: 'text',
                        localized: true,
                    },
                    createSimpleRichTextField(),
                    createImageField(),
                    createLinkField(),
                ],
            },
        ],
    },
});
