import type { Field } from 'payload';
import type { CollectionConfig } from '../lib/types';

export function createVideoVariantFields(config: CollectionConfig): Field[] {
    return [
        {
            name: 'transcodeId',
            type: 'text',
            admin: {
                hidden: true,
                readOnly: true,
            },
        },
        {
            name: 'videoVariants',
            type: 'group',
            interfaceName: 'VideoVariants',
            admin: {
                hidden: true,
                readOnly: true,
                components: {
                    Cell: '@repo/payload-video-transcoding-plugin#VideoVariantStatusCell',
                },
            },
            fields: Object.entries(config.variants)
                .filter(([_, variant]) => variant.type === 'video')
                .map(([sizeKey]) => ({
                    name: sizeKey,
                    type: 'group',
                    fields: [
                        {
                            name: 'url',
                            type: 'text',
                        },
                        {
                            name: 'key',
                            type: 'text',
                        },
                        {
                            name: 'jobId',
                            type: 'text',
                        },
                        {
                            name: 'status',
                            type: 'text',
                        },
                    ],
                })),
        },
    ];
}
