import {
    BoldFeature,
    FixedToolbarFeature,
    ItalicFeature,
    lexicalEditor,
    TextStateFeature,
} from '@payloadcms/richtext-lexical';
import type { RichTextField } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD: RichTextField = {
    name: 'simpleRichText',
    type: 'richText',
    localized: true,
    editor: lexicalEditor({
        features: [
            ItalicFeature(),
            BoldFeature(),
            TextStateFeature({
                state: {
                    textTransform: {
                        uppercase: {
                            label: 'Uppercase',
                            css: { 'text-transform': 'uppercase' },
                        },
                    },
                },
            }),
            FixedToolbarFeature(),
        ],
    }),
};

export const createSimpleRichTextField = fieldCreator(FIELD);
