import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createMediaField } from '../../payload/fields/media';

defineBlockConfig({
    block: {
        slug: 'clipped-media',
        imageURL: '/admin-assets/block-thumbnails/clipped-media.png',
        fields: [createMediaField()],
    },
});
