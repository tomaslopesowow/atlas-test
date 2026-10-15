import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import {
    BoldFeature,
    FixedToolbarFeature,
    ItalicFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical';

defineBlockConfig({
    block: {
        slug: 'quote',
        imageURL: '/admin-assets/block-thumbnails/quote.jpg',
        fields: [
            {
                name: 'quote',
                type: 'richText',
                localized: true,
                editor: lexicalEditor({
                    features: [
                        ItalicFeature(),
                        BoldFeature(),
                        FixedToolbarFeature(),
                    ],
                }),
            },
            {
                name: 'citee',
                type: 'group',
                fields: [
                    {
                        name: 'name',
                        type: 'text',
                        localized: true,
                    },
                    {
                        name: 'title',
                        type: 'text',
                        localized: true,
                    },
                ],
            },
        ],
    },
    withSettings: false,
});
