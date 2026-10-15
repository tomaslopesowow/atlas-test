import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';
import { createLinkField } from '../../payload/fields/link';
import { createMediaField } from '../../payload/fields/media';

defineBlockConfig({
    block: {
        slug: 'scattered-content',
        imageURL: '/admin-assets/block-thumbnails/scattered-content.png',
        fields: [
            createSimpleRichTextField({ name: 'title' }),
            createMediaField({ name: 'media1' }),
            createMediaField({ name: 'media2' }),
            createSimpleRichTextField({ name: 'subtitle' }),
            createSimpleRichTextField({ name: 'content' }),
            createLinkField(),
        ],
    },
});
