'use client';

import type { AppLocale } from '@repo/i18n/shared';
import clsx from 'clsx';
import type React from 'react';
import type {
    BlockAppearanceSettings,
    BlockLayoutSettings,
    BlockVisibilitySettings,
} from '@/payload-types';
import { useMotion } from '@/features/animation/hooks/use-motion';
import { useRef } from 'react';
import type { Maybe } from '@/utils/maybe';

/**
 * Maps horizontal padding settings to Tailwind CSS classes
 * Values range from 0 (no padding) to 8 (96px padding)
 */
const PADDING_X_CLASSNAMES = {
    0: 'px-0',
    1: 'px-4',
    2: 'px-8',
    3: 'px-16',
    4: 'px-32',
    5: 'px-48',
    6: 'px-64',
    7: 'px-80',
    8: 'px-96',
};

/**
 * Maps vertical padding settings to Tailwind CSS classes
 * Values range from 0 (no padding) to 8 (96px padding)
 */
const PADDING_TOP_CLASSNAMES = {
    0: 'pt-0',
    1: 'pt-4',
    2: 'pt-8',
    3: 'pt-8 md:pt-10',
    4: 'pt-10 md:pt-16',
    5: 'pt-16 md:pt-32',
    6: 'pt-20 md:pt-40',
    7: 'pt-30 md:pt-60',
    8: 'pt-40 md:pt-80',
};

const PADDING_BOTTOM_CLASSNAMES = {
    0: 'pb-0',
    1: 'pb-4',
    2: 'pb-8',
    3: 'pb-8 md:pb-10',
    4: 'pb-10 md:pb-16',
    5: 'pb-16 md:pb-32',
    6: 'pb-20 md:pb-40',
    7: 'pb-30 md:pb-60',
    8: 'pb-40 md:pb-80',
};

/**
 * BlockContainer wraps content blocks with consistent styling and layout options.
 * It handles:
 * - Background colors
 * - Container width (full-width or contained)
 * - Horizontal and vertical padding
 * - Navigation inset adjustments
 * - Locale-based visibility
 *
 * @param props.locale - Current application locale
 * @param props.layout - Layout settings for width, padding and navigation inset
 * @param props.appearance - Visual settings like background color
 * @param props.visibility - Locale-based visibility settings
 */
export const BlockContainer = ({
    id,
    locale: appLocale,
    layout,
    appearance,
    visibility,
    children,
    defaultAttributes,
}: React.PropsWithChildren<{
    id?: Maybe<string>;
    locale: AppLocale;
    layout?: BlockLayoutSettings;
    appearance?: BlockAppearanceSettings;
    visibility?: BlockVisibilitySettings;
    defaultAttributes?: React.HTMLAttributes<HTMLDivElement>;
}>) => {
    const { locale: blockLocale } = visibility ?? {};
    let { width, horizontalPadding, paddingTop, paddingBottom } = layout ?? {};
    let { theme } = appearance ?? {};

    // Set default values for optional settings
    horizontalPadding ??= '0';
    paddingTop ??= '3';
    paddingBottom ??= '3';
    theme ??= 'light';

    // Map settings to Tailwind CSS classes
    const paddingXClassName = PADDING_X_CLASSNAMES[horizontalPadding];
    const paddingTopClassName = PADDING_TOP_CLASSNAMES[paddingTop];
    const paddingBottomClassName = PADDING_BOTTOM_CLASSNAMES[paddingBottom];

    const ref = useRef<HTMLDivElement>(null);
    useMotion(
        ([{ default: gsap }]) => {
            const ctx = gsap.context(() => {
                const themeRoot = document.getElementById('theme-root');
                if (!themeRoot) return;

                gsap.to(themeRoot, {
                    scrollTrigger: {
                        trigger: ref.current,
                        start: 'top center',
                        end: 'bottom center',
                        toggleActions: 'play reset play reset',
                    },
                    onStart: () => {
                        theme === 'dark'
                            ? themeRoot.classList.add('dark')
                            : themeRoot.classList.remove('dark');
                    },
                });
            });
            return () => ctx.revert();
        },
        {
            observeWindowResize: true,
            load: {
                when: 'load',
            },
            loader: () => [import('gsap')],
        },
    );

    // Hide block if it has locale restrictions and current locale isn't included
    if (!!blockLocale?.length && !blockLocale.includes(appLocale)) return;

    return (
        <div
            {...defaultAttributes}
            className={clsx('text-primary', defaultAttributes?.className)}
            ref={ref}
            data-block-id={id ?? undefined}
        >
            <div
                className={clsx({
                    'px-4 md:px-10': width === 'contained',
                })}
            >
                <div
                    className={clsx(
                        paddingXClassName,
                        paddingTopClassName,
                        paddingBottomClassName,
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};
