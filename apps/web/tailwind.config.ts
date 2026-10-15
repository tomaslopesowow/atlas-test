import typographyPlugin from '@tailwindcss/typography';
import { withTV } from 'tailwind-variants/transformer';
import type { Config } from 'tailwindcss';
import type { CustomThemeConfig, RawFile } from 'tailwindcss/types/config';
import tailwindCSSPluginAnimate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

const primitiveColors: Partial<CustomThemeConfig> = {
    danger: 'var(--danger)',
    success: 'var(--success)',
    info: 'var(--info)',
    warning: 'var(--warning)',
    white: 'var(--white)',
    'dark-blue': 'var(--dark-blue)',
    'dark-blue-secondary': 'var(--dark-blue-secondary)',

    text: {
        primary: 'var(--text-primary)',
        headline: 'var(--text-headline)',
        body: 'var(--text-body)',
        invert: 'var(--text-invert)',
        'invert-secondary': 'var(--text-invert-secondary)',
        placeholder: 'var(--text-placeholder)',
        disabled: 'var(--text-disabled)',
    },

    background: {
        primary: 'var(--background-primary)',
        secondary: 'var(--background-secondary)',
        invert: 'var(--background-invert)',
        'invert-secondary': 'var(--background-invert-secondary)',
    },

    surface: {
        primary: 'var(--surface-primary)',
        secondary: 'var(--surface-secondary)',
        tertiary: 'var(--surface-tertiary)',
    },

    border: {
        primary: 'var(--border-primary)',
        secondary: 'var(--border-secondary)',
        tertiary: 'var(--border-tertiary)',
    },

    stroke: {
        primary: 'var(--border-primary)',
        secondary: 'var(--border-secondary)',
        tertiary: 'var(--border-tertiary)',
    },

    outline: {
        primary: 'var(--border-tertiary)',
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
        colors: {
            ...primitiveColors,
        },
        extend: {
            screens: {
                ultrawide: '1920px',
            },
            textColor: {
                ...primitiveColors.text,
            },
            backgroundColor: {
                ...primitiveColors.background,
            },
            surfaceColor: {
                ...primitiveColors.surface,
            },
            borderColor: {
                ...primitiveColors.border,
            },
            outlineColor: {
                ...primitiveColors.outline,
            },
            stroke: {
                ...primitiveColors.stroke,
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

            fontFamily: {
                sans: ['var(--font-gotham-pro)', 'sans-serif'],
                serif: ['var(--font-ppeiko)', 'serif'],
                mono: ['var(--font-ppneuemontrealmono)', 'monospace'],
                'sweet-sans-pro': ['var(--font-sweet-sans-pro)', 'sans-serif'],
            },

            fontSize: {
                '2xs': '0.625rem', // 10px
                xs: '0.75rem', // 12px
                sm: '0.875rem', // 14px
                base: '1rem', // 16px
                lg: '1.125rem', // 18px
                xl: '1.25rem', // 20px
                '2xl': '1.5rem', // 24px
                '3xl': '1.875rem', // 30px
                '4xl': '2.5rem', // 40px
                '5xl': '3rem', // 48px
                '6xl': '3.75rem', // 60px
                '7xl': '4.5rem', // 72px
                '8xl': '6rem', // 96px
                '9xl': '7rem', // 112px
                '10xl': '8rem', // 128px
            },

            lineHeight: {
                tight: '1.1',
                snug: '1.2',
                base: '1.4',
            },

            gap: {
                DEFAULT: '1rem',
            },

            blur: {
                xs: '2px',
                sm: '6px',
            },

            transitionDuration: {
                1500: '1500ms',
            },

            transitionTimingFunction: {
                'in-out-quart': 'cubic-bezier(0.78, 0, 0.22, 1)',
                'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
            },

            tracking: {
                tighter: '-0.04em',
                tight: '-0.02em',
                slight: '-0.01em',
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
            'collapsible-down': {
                from: { height: '0' },
                to: { height: 'var(--radix-collapsible-content-height)' },
            },
            'collapsible-up': {
                from: { height: 'var(--radix-collapsible-content-height)' },
                to: { height: '0' },
            },
            fadeIn: {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
            },
            fadeOut: {
                '0%': { opacity: '1' },
                '100%': { opacity: '0' },
            },
            ping: {
                '75%, 100%': {
                    transform: 'scale(1.5)',
                    opacity: '0',
                },
            },
            slideOutLeft: {
                '0%': { transform: 'translateX(0)' },
                '100%': { transform: 'translateX(calc(-100% - 1rem))' },
            },
            slideInLeft: {
                '0%': { transform: 'translateX(calc(-100% - 1rem))' },
                '100%': { transform: 'translateX(0)' },
            },
            pulse: {
                '0%, 100%': { opacity: '1' },
                '50%': { opacity: '0.5' },
            },
            clipToCenter: {
                '0%': { clipPath: 'inset(0% 0)' },
                '100%': { clipPath: 'inset(50% 0)' },
            },
            clipFromCenter: {
                '0%': { clipPath: 'inset(50% 0)' },
                '100%': { clipPath: 'inset(0% 0)' },
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
            'fade-in': 'fadeIn 0.3s ease-out',
            'fade-out': 'fadeOut 0.3s ease-out',
            'collapsible-down': 'collapsible-down 0.2s ease-out',
            'collapsible-up': 'collapsible-up 0.2s ease-out',
            ping: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            'slide-out-left': 'slideOutLeft 0.5s ease-out 0.2s forwards',
            'slide-in-left': 'slideInLeft 0.5s ease-out',
            pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            'clip-to-center': 'clipToCenter 0.5s ease-out',
            'clip-from-center': 'clipFromCenter 0.5s ease-out',
        },
    },

    plugins: [
        tailwindCSSPluginAnimate,
        typographyPlugin,
        plugin(({ addVariant }) => {
            addVariant('pointer-coarse', '@media (pointer: coarse)');
            addVariant('pointer-fine', '@media (pointer: fine)');
        }),
    ],
});

export default config;
