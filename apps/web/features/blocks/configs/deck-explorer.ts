import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createImageField } from '../../payload/fields/image';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';

defineBlockConfig({
    block: {
        slug: 'deck-explorer',
        imageURL: '/admin-assets/block-thumbnails/deck-explorer.jpg',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'items',
                type: 'array',
                fields: [
                    {
                        name: 'deckName',
                        type: 'text',
                        localized: true,
                        required: true,
                    },
                    createImageField({
                        name: 'deckImage',
                        required: true,
                    }),
                    {
                        name: 'highlights',
                        type: 'array',
                        fields: [
                            {
                                name: 'title',
                                type: 'text',
                                localized: true,
                                required: true,
                            },
                            createImageField(),
                            createSimpleRichTextField(),
                            {
                                name: 'position',
                                type: 'group',
                                fields: [
                                    {
                                        name: 'x',
                                        type: 'number',
                                        min: 0,
                                        max: 100,
                                        required: true,
                                    },
                                    {
                                        name: 'y',
                                        type: 'number',
                                        min: 0,
                                        max: 100,
                                        required: true,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
});
