import { createSizeOptions } from '@/features/payload/utils/create-size-options';
import { fieldCreator } from '@/features/payload/utils/object-composer';
import { I18N_LOCALES } from '@repo/i18n/shared';
import type { CollapsibleField, NamedGroupField, Option } from 'payload';

export type SettingType = 'layout' | 'appearance' | 'visibility';

const PADDING_OPTIONS = createSizeOptions(9, [
    'none',
    'small',
    'medium',
    'large',
]);

const BLOCK_APPEARANCE_BACKGROUND_COLOR_OPTIONS: Option[] = [
    {
        label: 'Transparent',
        value: 'transparent',
    },
    {
        label: 'White',
        value: 'white',
    },
    {
        label: 'Off white',
        value: 'offWhite',
    },
] as const;

const FIELD = fieldCreator<CollapsibleField>({
    label: 'Block settings',
    type: 'collapsible',
    admin: {
        initCollapsed: true,
        description:
            'These settings allow you to customize the appearance and layout of the block. You can adjust parameters such as the background color, or the amount of space surrounding the block for a more tailored appearance.',
    },
    fields: [
        {
            type: 'tabs',
            tabs: [
                {
                    name: 'layout',
                    interfaceName: 'BlockLayoutSettings',
                    fields: [
                        {
                            name: 'width',
                            type: 'select',
                            defaultValue: 'contained',
                            options: [
                                {
                                    label: 'Fluid',
                                    value: 'fluid',
                                },
                                {
                                    label: 'Contained',
                                    value: 'contained',
                                },
                            ],
                            admin: {
                                description:
                                    "This setting determines the block's width on the page. If set to `fluid`, the block will expand to fill the available width of its layout. If set to `contained`, the block's width will be fixed to a responsive breakpoint.",
                            },
                        },
                        {
                            name: 'horizontalPadding',
                            type: 'select',
                            defaultValue: '0',
                            options: PADDING_OPTIONS,
                        },
                        {
                            name: 'paddingTop',
                            type: 'select',
                            defaultValue: '3',
                            options: PADDING_OPTIONS,
                        },
                        {
                            name: 'paddingBottom',
                            type: 'select',
                            defaultValue: '3',
                            options: PADDING_OPTIONS,
                        },
                        {
                            name: 'navigationInset',
                            type: 'checkbox',
                            defaultValue: false,
                            admin: {
                                description:
                                    'This setting determines if the block should be vertically inset from the navigation bar.',
                            },
                        },
                    ],
                },
                {
                    name: 'appearance',
                    interfaceName: 'BlockAppearanceSettings',
                    fields: [
                        {
                            name: 'backgroundColor',
                            type: 'select',
                            defaultValue: 'transparent',
                            options: BLOCK_APPEARANCE_BACKGROUND_COLOR_OPTIONS,
                            admin: {
                                description:
                                    'This setting determines the background color of the block.',
                            },
                        },
                    ],
                },
                {
                    name: 'visibility',
                    interfaceName: 'BlockVisibilitySettings',
                    fields: [
                        {
                            name: 'locale',
                            type: 'select',
                            hasMany: true,
                            options: [...I18N_LOCALES],
                            admin: {
                                description:
                                    'This setting determines in which languages the block will be visible. ' +
                                    'Select one or multiple languages. If no option is selected, the block will be shown in all languages.',
                            },
                        },
                    ],
                },
            ],
        },
    ],
});

export const createBlockSettingsField = (settings: SettingType[] = []) => {
    if (!settings.length) return FIELD();

    return FIELD(({ fields, ...field }) => ({
        ...field,
        fields: fields.filter((f) =>
            settings.includes((f as NamedGroupField).name as SettingType),
        ),
    }));
};
