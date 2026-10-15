import typographyPlugin from '@tailwindcss/typography';
import { withTV } from 'tailwind-variants/transformer';
import type { Config } from 'tailwindcss';
import tailwindCSSPluginAnimate from 'tailwindcss-animate';
import type { RawFile } from 'tailwindcss/types/config';

/**
 * Radix color system with semantic naming
 */
const primitives = {
    primary: {
        DEFAULT: 'var(--primary-solid-9)',
        background1: 'var(--primary-background-1)',
        background2: 'var(--primary-background-2)',
        interactive3: 'var(--primary-interactive-3)',
        interactive4: 'var(--primary-interactive-4)',
        interactive5: 'var(--primary-interactive-5)',
        border6: 'var(--primary-border-6)',
        border7: 'var(--primary-border-7)',
        border8: 'var(--primary-border-8)',
        solid9: 'var(--primary-solid-9)',
        solid10: 'var(--primary-solid-10)',
        text11: 'var(--primary-text-11)',
        text12: 'var(--primary-text-12)',

        // Alpha variants
        alpha1: 'var(--primary-alpha-1)',
        alpha2: 'var(--primary-alpha-2)',
        alpha3: 'var(--primary-alpha-3)',
        alpha4: 'var(--primary-alpha-4)',
        alpha5: 'var(--primary-alpha-5)',
        alpha6: 'var(--primary-alpha-6)',
        alpha7: 'var(--primary-alpha-7)',
        alpha8: 'var(--primary-alpha-8)',
        alpha9: 'var(--primary-alpha-9)',
        alpha10: 'var(--primary-alpha-10)',
        alpha11: 'var(--primary-alpha-11)',
        alpha12: 'var(--primary-alpha-12)',

        // Special variants
        contrast: 'var(--primary-contrast)',
        surface: 'var(--primary-surface)',
        indicator: 'var(--primary-indicator)',
        track: 'var(--primary-track)',
    },
    gray: {
        DEFAULT: 'var(--gray-solid-9)',
        background1: 'var(--gray-background-1)',
        background2: 'var(--gray-background-2)',
        interactive3: 'var(--gray-interactive-3)',
        interactive4: 'var(--gray-interactive-4)',
        interactive5: 'var(--gray-interactive-5)',
        border6: 'var(--gray-border-6)',
        border7: 'var(--gray-border-7)',
        border8: 'var(--gray-border-8)',
        solid9: 'var(--gray-solid-9)',
        solid10: 'var(--gray-solid-10)',
        text11: 'var(--gray-text-11)',
        text12: 'var(--gray-text-12)',

        // Alpha variants
        alpha1: 'var(--gray-alpha-1)',
        alpha2: 'var(--gray-alpha-2)',
        alpha3: 'var(--gray-alpha-3)',
        alpha4: 'var(--gray-alpha-4)',
        alpha5: 'var(--gray-alpha-5)',
        alpha6: 'var(--gray-alpha-6)',
        alpha7: 'var(--gray-alpha-7)',
        alpha8: 'var(--gray-alpha-8)',
        alpha9: 'var(--gray-alpha-9)',
        alpha10: 'var(--gray-alpha-10)',
        alpha11: 'var(--gray-alpha-11)',
        alpha12: 'var(--gray-alpha-12)',

        // Special variants
        contrast: 'var(--gray-contrast)',
        surface: 'var(--gray-surface)',
        indicator: 'var(--gray-indicator)',
        track: 'var(--gray-track)',
    },
};

/**
 * Tailwind property mappings for shadcn/ui components
 */
const ui = {
    animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
    },

    colors: {
        ...primitives,
    },

    keyframes: {
        'accordion-down': {
            from: { height: '0' },
            to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
            from: { height: 'var(--radix-accordion-content-height)' },
            to: { height: '0' },
        },
    },
};

const config: Config = withTV({
    darkMode: 'class',

    presets:
        process.env.RELUME === 'yes'
            ? [require('@relume_io/relume-tailwind')]
            : undefined,

    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './features/**/*.{ts,tsx}',
        process.env.RELUME === 'yes' &&
            './node_modules/@relume_io/relume-ui/dist/**/*.{js,ts,jsx,tsx}',
    ].filter(Boolean) as (string | RawFile)[],

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
            animation: {
                ...ui.animation,
            },

            container: {
                center: true,
                padding: {
                    DEFAULT: '1rem',
                    md: '2rem',
                },
            },

            colors: {
                ...ui.colors,
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

            keyframes: {
                ...ui.keyframes,
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
        },

        animation: {
            slideInUp: 'slideInUp .4s ease-out 1 backwards',
            fadeInFromTop: 'fadeInFromTop 0.3s ease-out',
            fadeInFromRight: 'fadeInFromRight 0.3s ease-out',
            fadeInFromBottom: 'fadeInFromBottom 0.3s ease-out',
            fadeInFromLeft: 'fadeInFromLeft 0.3s ease-out',
        },
    },

    plugins: [tailwindCSSPluginAnimate, typographyPlugin],
});

export default config;
