import type { CollectionConfig } from 'payload';
import { createImageField } from '@/features/payload/fields/image';
import { createLinkField } from '../fields/link';

export const Testimonials: CollectionConfig = {
    slug: 'testimonials',

    admin: {
        useAsTitle: 'content',
        defaultColumns: ['content', 'id'],
    },

    fields: [
        createImageField({
            name: 'logo',
            admin: {
                description: 'This logo will be displayed in the testimonial.',
            },
        }),
        {
            name: 'author',
            type: 'relationship',
            relationTo: 'people',
            required: true,
            admin: {
                description:
                    'This field connects the testimonial to an individual from your people list.',
            },
        },
        {
            name: 'content',
            type: 'textarea',
            localized: true,
            maxLength: 350,
            admin: {
                description:
                    'This text field allows you to share their opinion and experiences.',
            },
        },
        createLinkField(),
    ],
};
