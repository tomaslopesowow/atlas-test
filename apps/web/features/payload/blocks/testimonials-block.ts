import { createBlock } from '@/features/payload/utils/create-block';

export const TestimonialsBlock = createBlock({
    slug: 'testimonials-block',
    imageURL: '/admin-assets/block-thumbnails/testimonials-block.png',
    labels: {
        singular: 'Testimonial',
        plural: 'Testimonials',
    },

    fields: [
        {
            name: 'title',
            type: 'text',
            localized: true,
        },
        {
            name: 'subtitle',
            type: 'textarea',
            localized: true,
        },
        {
            name: 'testimonials',
            relationTo: 'testimonials',
            hasMany: true,
            type: 'relationship',
            admin: {
                isSortable: true,
            },
        },
    ],
});
