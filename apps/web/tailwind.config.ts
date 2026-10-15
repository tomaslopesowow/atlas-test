import typographyPlugin from '@tailwindcss/typography';
import { withTV } from 'tailwind-variants/transformer';
import type { Config } from 'tailwindcss';
import tailwindCSSPluginAnimate from 'tailwindcss-animate';

type Tokens = NonNullable<Config['theme']>['extend'];

const TOKENS: Tokens = {
    white: 'var(--white)',
    black: 'var(--black)',

    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    info: 'var(--info)',

    'surface-primary': 'var(--surface-primary)',
    'surface-secondary': 'var(--surface-secondary)',
    'surface-tertiary': 'var(--surface-tertiary)',
    'surface-invert': 'var(--surface-invert)',
    'surface-input-default': 'var(--surface-input-default)',
    'surface-input-disabled': 'var(--surface-input-disabled)',
    'surface-input-danger': 'var(--surface-input-danger)',

    textColor: {
        headline: 'var(--text-headline)',
        paragraph: 'var(--text-paragraph)',
        placeholder: 'var(--text-placeholder)',
        invert: 'var(--text-invert)',

        'icon-primary': 'var(--icon-primary)',
        'icon-secondary': 'var(--icon-secondary)',

        'input-active': 'var(--text-input-active)',
        'input-default': 'var(--text-input-default)',
    },

    borderColor: {
        gray: 'var(--border-gray)',
        full: 'var(--border-full)',
        'input-default': 'var(--border-input-default)',
    },

    backgroundColor: {
        primary: 'var(--background-primary)',

        'button-primary-default': 'var(--button-primary-default)',
        'button-primary-hover': 'var(--button-primary-hover)',
        'button-primary-disabled': 'var(--button-primary-disabled)',
        'button-primary-pressed': 'var(--button-primary-pressed)',
        'button-secondary-default': 'var(--button-secondary-default)',
        'button-secondary-hover': 'var(--button-secondary-hover)',
        'button-secondary-pressed': 'var(--button-secondary-pressed)',
        'button-secondary-disabled': 'var(--button-secondary-disabled)',
    },
};

const config: Config = withTV({
    darkMode: 'class',

    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './features/**/*.{ts,tsx}',
    ],

    safelist: [
        /**
         * Grid colums 1 to 12 are safelisted to maintain
         * better dynamic grid system support in react components.
         */
        ...Array.from({ length: 12 }, (_, index) => [
            `grid-cols-${index + 1}`,
            `col-span-${index + 1}`,
        ]).flat(),

        'text-center',
        'text-right',
        'text-left',
        'text-justify',
    ],

    theme: {
        extend: {
            ...TOKENS,

            colors: {
                ...TOKENS,
            },

            container: {
                center: true,
                padding: {
                    DEFAULT: '1rem',
                    md: '2rem',
                },
            },

            borderRadius: {
                lg: '1rem',
                md: 'calc(1rem - 8px)',
            },

            fontSize: {
                sm: '0.875rem',
                base: '1rem',
            },

            gap: {
                DEFAULT: '1rem',
            },
        },

        keyframes: {
            slideInUp: {
                '0%': { transform: 'translateY(1.5rem)' },
                '100%': { transform: 'translateY(0)' },
            },
            fadeInFromTop: {
                '0%': { transform: 'translateY(-100%)' },
                '100%': { transform: 'translateY(0)' },
            },
            fadeInFromRight: {
                '0%': { transform: 'translateX(100%)' },
                '100%': { transform: 'translateX(0)' },
            },
            fadeInFromBottom: {
                '0%': { transform: 'translateY(100%)' },
                '100%': { transform: 'translateY(0)' },
            },
            fadeInFromLeft: {
                '0%': { transform: 'translateX(-100%)' },
                '100%': { transform: 'translateX(0)' },
            },
            'accordion-down': {
                from: { height: '0' },
                to: { height: 'var(--radix-accordion-content-height)' },
            },
            'accordion-up': {
                from: { height: 'var(--radix-accordion-content-height)' },
                to: { height: '0' },
            },
        },

        animation: {
            slideInUp: 'slideInUp .4s ease-out 1 backwards',
            fadeInFromTop: 'fadeInFromTop 0.3s ease-out',
            fadeInFromRight: 'fadeInFromRight 0.3s ease-out',
            fadeInFromBottom: 'fadeInFromBottom 0.3s ease-out',
            fadeInFromLeft: 'fadeInFromLeft 0.3s ease-out',
            'accordion-down': 'accordion-down 0.2s ease-out',
            'accordion-up': 'accordion-up 0.2s ease-out',
        },
    },

    plugins: [tailwindCSSPluginAnimate, typographyPlugin],
});

export default config;
