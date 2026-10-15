import type { CollapsibleField } from 'payload';
import { fieldCreator } from '../utils/object-composer';
import { createImageObjectFitField } from './object-fit';
import { createImageObjectPositionField } from './object-position';
const FIELD = Object.freeze<CollapsibleField>({
    label: 'Video settings',
    type: 'collapsible',
    admin: {
        initCollapsed: true,
        description:
            'These settings allow you to customize the video properties.',
    },
    fields: [
        createImageObjectFitField(),
        createImageObjectPositionField(),
        {
            type: 'row',
            fields: [
                {
                    name: 'loop',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: {
                        description:
                            'If enabled, the video will loop indefinitely.',
                        width: '50%',
                    },
                },
                {
                    name: 'muted',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: {
                        description:
                            'If enabled, the video will play without audio.',
                        width: '50%',
                    },
                },
            ],
        },
        {
            type: 'row',
            fields: [
                {
                    name: 'autoplay',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                        description:
                            'If enabled, the video will play automatically.',
                        width: '50%',
                    },
                },
                {
                    name: 'controls',
                    label: 'Show controls',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                        description:
                            'If enabled, the video will display controls.',
                        width: '50%',
                    },
                },
            ],
        },
        {
            type: 'row',
            fields: [
                {
                    name: 'playsInline',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: {
                        description:
                            'If enabled, the video will play inline which is mostly required for iOS devices.',
                        width: '50%',
                    },
                },
            ],
        },
    ],
});

export const createVideoSettingsField = fieldCreator(FIELD);
