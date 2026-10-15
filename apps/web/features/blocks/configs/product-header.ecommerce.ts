import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';

defineBlockConfig({
    block: {
        slug: 'product-header',
        imageURL: '/admin-assets/block-thumbnails/product-header.png',
        fields: [
            {
                name: 'promotionalMessage',
                type: 'text',
                admin: {
                    description:
                        'For example: "Free shipping on orders over €50"',
                },
            },
            {
                name: 'messages',
                type: 'group',
                fields: [
                    {
                        name: 'buy',
                        type: 'text',
                        defaultValue: ({ locale }) =>
                            ({ en: 'Buy now', nl: 'Koop nu' })[
                                locale ?? I18N_DEFAULT_LOCALE
                            ],
                    },
                ],
            },
        ],
    },
});
