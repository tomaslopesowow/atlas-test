import { createImageField } from '@/features/payload/fields/image';
import type { CollectionConfig } from 'payload';

export const Testimonials: CollectionConfig = {
    slug: 'testimonials',

    admin: {
        defaultColumns: ['author', 'id'],
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
    ],
};
