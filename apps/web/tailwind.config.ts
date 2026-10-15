import typographyPlugin from '@tailwindcss/typography';
import { withTV } from 'tailwind-variants/transformer';
import type { Config } from 'tailwindcss';
import tailwindCSSPluginAnimate from 'tailwindcss-animate';
import type { RawFile } from 'tailwindcss/types/config';

const primitives = {
    black: {
        DEFAULT: '#0c0c0c',
        off: '#121212',
        light: '#1a1a1a',
    },
    white: {
        DEFAULT: '#ffffff',
        off: '#f3f6f7',
        light: '#edf1f2',
    },
    grey: {
        DEFAULT: '#828282',
        light: '#aaaaaa',
    },
    blue: {
        DEFAULT: '#63aef7',
    },
    red: {
        DEFAULT: '#b42318',
    },
    green: {
        DEFAULT: '#027a48',
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
        // what we actually use
        ...primitives,

        background: {
            primary: primitives.white.DEFAULT,
            secondary: primitives.white.off,
        },

        surface: {
            primary: primitives.black.DEFAULT,
            secondary: primitives.white.off,
            tertiary: primitives.black.light,
            grey: primitives.grey.light,
            'dark-grey': primitives.grey.DEFAULT,
            alternate: primitives.white.DEFAULT,
            'alternate-secondary': primitives.white.off,
            'alternate-tertiary': primitives.white.light,
            highlight: primitives.blue.DEFAULT,
        },

        text: {
            primary: primitives.black.DEFAULT,
            secondary: primitives.grey.light,
            highlight: primitives.blue.DEFAULT,
            alternate: primitives.white.DEFAULT,
            'alternate-secondary': primitives.grey.DEFAULT,
            error: primitives.red.DEFAULT,
        },

        border: {
            primary: primitives.black.DEFAULT,
            secondary: primitives.grey.light,
            tertiary: primitives.grey.DEFAULT,
            alternate: primitives.white.DEFAULT,
            success: primitives.green.DEFAULT,
            error: primitives.red.DEFAULT,
            highlight: primitives.blue.DEFAULT,
        },

        // boilerplate colors
        accent: {
            DEFAULT: 'hsl(var(--ui-accent))',
            foreground: 'hsl(var(--ui-accent-foreground))',
        },

        card: {
            DEFAULT: 'hsl(var(--ui-background))',
            foreground: 'hsl(var(--ui-foreground))',
        },

        destructive: {
            DEFAULT: 'hsl(var(--ui-destructive))',
            foreground: 'hsl(var(--ui-destructive-foreground))',
        },

        foreground: 'hsl(var(--ui-foreground))',
        input: 'hsl(var(--ui-input))',

        muted: {
            DEFAULT: 'hsl(var(--ui-muted))',
            foreground: 'hsl(var(--ui-muted-foreground))',
        },

        popover: {
            DEFAULT: 'hsl(var(--ui-background))',
            foreground: 'hsl(var(--ui-foreground))',
        },

        primary: {
            DEFAULT: 'hsl(var(--ui-primary))',
            foreground: 'hsl(var(--ui-primary-foreground))',
        },

        ring: 'hsl(var(--ui-ring))',

        secondary: {
            DEFAULT: 'hsl(var(--ui-secondary))',
            foreground: 'hsl(var(--ui-secondary-foreground))',
        },
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
                lg: '0.5rem',
                md: 'calc(0.5rem - 2px)',
                sm: 'calc(0.5rem - 4px)',
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
                '0%': { transform: 'translateY(1.5rem)', opacity: '0' },
                '100%': { transform: 'translateY(0)', opacity: '100%' },
            },
        },

        animation: {
            slideInUp: 'slideInUp .4s ease-out 1 backwards',
        },
    },

    plugins: [tailwindCSSPluginAnimate, typographyPlugin],
});

export default config;
