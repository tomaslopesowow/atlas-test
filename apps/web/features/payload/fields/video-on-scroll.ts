import type { Field } from 'payload';
import { fieldCreator } from '../utils/object-composer';

const FIELD: Field = {
    type: 'group',
    name: 'videoOnScroll',
    fields: [
        {
            type: 'collapsible',
            label: 'Video',
            fields: [
                {
                    name: 'video',
                    type: 'upload',
                    relationTo: 'scroll-videos',
                    filterOptions: {
                        and: [
                            {
                                'videoVariants.vp9.status': {
                                    equals: 'completed',
                                },
                            },
                            {
                                'videoVariants.vp9Mobile.status': {
                                    equals: 'completed',
                                },
                            },
                        ],
                    },
                },
                {
                    type: 'collapsible',
                    label: 'Advanced',
                    admin: {
                        initCollapsed: true,
                    },
                    fields: [
                        {
                            type: 'number',
                            name: 'scrollLength',
                            label: 'Scroll Length',
                            defaultValue: 200,
                            admin: {
                                description:
                                    'The total length the user has to scroll to play the whole video, in vh.',
                            },
                        },
                        {
                            type: 'number',
                            name: 'startOffset',
                            label: 'Start Offset',
                            defaultValue: 0,
                            admin: {
                                description:
                                    'The offset in vh from the top of the screen at which the video will start playing.',
                            },
                        },
                        {
                            type: 'checkbox',
                            name: 'pin',
                            defaultValue: true,
                            admin: {
                                description:
                                    'Whether to pin the video to the screen.',
                            },
                        },
                        {
                            type: 'number',
                            name: 'pinLength',
                            defaultValue: 200,
                            admin: {
                                description:
                                    'The length of the video that will be pinned to the screen, in vh.',
                                condition: (_, siblingData) => siblingData?.pin,
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const createVideoOnScrollField = fieldCreator(FIELD);
