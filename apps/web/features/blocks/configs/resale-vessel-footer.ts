import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import {
    BoldFeature,
    FixedToolbarFeature,
    ItalicFeature,
    lexicalEditor,
    LinkFeature,
    ParagraphFeature,
    UnderlineFeature,
} from '@payloadcms/richtext-lexical';

defineBlockConfig({
    block: {
        slug: 'resale-vessel-footer',
        imageURL: '/admin-assets/block-thumbnails/resale-vessel-footer.jpg',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'text',
                type: 'richText',
                editor: lexicalEditor({
                    features: [
                        ItalicFeature(),
                        BoldFeature(),
                        UnderlineFeature(),
                        LinkFeature(),
                        ParagraphFeature(),
                        FixedToolbarFeature(),
                    ],
                }),
                localized: true,
            },
        ],
    },
});
