import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createShareLinksField } from '../../payload/fields/share-links';

defineBlockConfig({
    block: {
        slug: 'article-footer',
        imageURL: '/admin-assets/block-thumbnails/article-footer.png',
        fields: [createShareLinksField()],
    },
});
