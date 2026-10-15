import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { createSimpleRichTextField } from '../../payload/fields/simple-rich-text';
import { createLinkField } from '@/features/payload/fields/link';
import { isPossibleNumber } from 'libphonenumber-js';
import type { Maybe } from '@/utils/maybe';

defineBlockConfig({
    block: {
        slug: 'contact',
        imageURL: '/admin-assets/block-thumbnails/contact.png',
        fields: [
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'categories',
                type: 'array',
                fields: [
                    {
                        name: 'title',
                        type: 'text',
                        localized: true,
                    },
                    {
                        name: 'groups',
                        type: 'array',
                        fields: [
                            {
                                name: 'title',
                                type: 'text',
                                localized: true,
                            },
                            createSimpleRichTextField({ name: 'details' }),
                            {
                                name: 'phone',
                                type: 'text',
                                validate: (value: Maybe<string>) =>
                                    !value
                                        ? true
                                        : isPossibleNumber(value, undefined) ||
                                          'Invalid phone number',
                            },
                            {
                                name: 'email',
                                type: 'email',
                            },
                            createLinkField(),
                        ],
                    },
                ],
            },
        ],
    },
});
