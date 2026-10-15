import type { GroupField, TypedLocale } from 'payload';

const defaultMessages = {
    en: {
        cart: 'Cart',
        title: 'Your cart ({count})',
        empty: 'Your cart is empty',
        shopNow: 'Shop now',
        total: 'Total',
        subtotal: 'Subtotal',
        shippingCost: 'Shipping cost',
        goToCheckout: 'Go to checkout',
        goToCartPage: 'Go to cart',
        checkout: 'Checkout',
        free: 'Free',
        shippingCalculatedAtCheckout: 'Shipping calculated at checkout',
    },
};

type AvailableLocales = keyof typeof defaultMessages;

const getDefaultValue = ({
    locale,
    value,
}: {
    locale: TypedLocale | undefined;
    value: keyof (typeof defaultMessages)[AvailableLocales];
}) => {
    if (locale && locale in defaultMessages)
        return defaultMessages[locale as AvailableLocales][value];

    return defaultMessages.en[value];
};

export const CartMessages: GroupField = {
    name: 'cart',
    label: 'Cart',
    type: 'group',

    fields: [
        {
            name: 'cart',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'cart' }),
        },
        {
            name: 'title',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'title' }),
            admin: {
                description:
                    'Use the {count} placeholder to display the number of items in the cart.',
            },
        },
        {
            name: 'empty',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'empty' }),
        },
        {
            name: 'shopNow',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'shopNow' }),
        },
        {
            name: 'total',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'total' }),
        },
        {
            name: 'subtotal',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'subtotal' }),
        },
        {
            name: 'shippingCost',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'shippingCost' }),
        },
        {
            name: 'goToCheckout',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'goToCheckout' }),
        },
        {
            name: 'goToCartPage',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'goToCartPage' }),
        },
        {
            name: 'checkout',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'checkout' }),
        },
        {
            name: 'free',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({ locale, value: 'free' }),
        },
        {
            name: 'shippingCalculatedAtCheckout',
            type: 'text',
            localized: true,
            defaultValue: ({ locale }) =>
                getDefaultValue({
                    locale,
                    value: 'shippingCalculatedAtCheckout',
                }),
        },
    ],
};
