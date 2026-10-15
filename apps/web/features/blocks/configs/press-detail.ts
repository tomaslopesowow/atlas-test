import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createShareLinksField } from '../../payload/fields/share-links';

defineBlockConfig({
    block: {
        slug: 'press-detail',
        imageURL: '/admin-assets/block-thumbnails/press-detail.jpg',

        fields: [createShareLinksField()],
    },
});
