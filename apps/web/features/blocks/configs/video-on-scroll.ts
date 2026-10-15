import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createVideoOnScrollField } from '../../payload/fields/video-on-scroll';

defineBlockConfig({
    block: {
        slug: 'video-on-scroll',
        imageURL: '',
        fields: [createVideoOnScrollField()],
    },
});
