import {
    type SettingType,
    createBlockSettingsField,
} from '@/features/payload/fields/block-settings';
import camelCase from 'lodash.camelcase';
import type { Block } from 'payload';

type PayloadBlock<TSlug extends string> = Omit<Block, 'slug' | 'imageURL'> & {
    slug: TSlug;
    imageURL: string;
};

export const createBlock = <TSlug extends string>(
    config: PayloadBlock<TSlug>,
    settingTypes?: SettingType[],
): PayloadBlock<TSlug> => ({
    ...config,
    interfaceName: camelCase(config.interfaceName || config.slug),
    fields: [...config.fields, createBlockSettingsField(settingTypes)],
});
