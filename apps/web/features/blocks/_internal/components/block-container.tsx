import type {
    BlockAppearanceSettings,
    BlockLayoutSettings,
    BlockVisibilitySettings,
} from '@/payload-types';
import type { AppLocale } from '@repo/i18n/shared';
import clsx from 'clsx';
import type React from 'react';

/**
 * Maps background color settings to Tailwind CSS classes
 */
const BACKGROUND_CLASSNAMES = {
    white: 'bg-white',
    offWhite: 'bg-gray-background2',
    transparent: 'bg-transparent',
} satisfies Record<string, string>;

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
    3: 'pt-16',
    4: 'pt-32',
    5: 'pt-48',
    6: 'pt-64',
    7: 'pt-80',
    8: 'pt-96',
};

const PADDING_BOTTOM_CLASSNAMES = {
    0: 'pb-0',
    1: 'pb-4',
    2: 'pb-8',
    3: 'pb-16',
    4: 'pb-32',
    5: 'pb-48',
    6: 'pb-64',
    7: 'pb-80',
    8: 'pb-96',
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
    locale: appLocale,
    layout,
    appearance,
    visibility,
    children,
    defaultAttributes,
}: React.PropsWithChildren<{
    locale: AppLocale;
    layout?: BlockLayoutSettings;
    appearance?: BlockAppearanceSettings;
    visibility?: BlockVisibilitySettings;
    defaultAttributes?: React.HTMLAttributes<HTMLDivElement>;
}>) => {
    const { locale: blockLocale } = visibility ?? {};

    // Hide block if it has locale restrictions and current locale isn't included
    if (!!blockLocale?.length && !blockLocale.includes(appLocale)) return;

    let {
        width,
        horizontalPadding,
        paddingTop,
        paddingBottom,
        navigationInset,
    } = layout ?? {};

    let { backgroundColor } = appearance ?? {};

    // Set default values for optional settings
    horizontalPadding ??= '0';
    paddingTop ??= '3';
    paddingBottom ??= '3';
    backgroundColor ??= 'transparent';

    // Map settings to Tailwind CSS classes
    const backgroundColorClassName = BACKGROUND_CLASSNAMES[backgroundColor];
    const paddingXClassName = PADDING_X_CLASSNAMES[horizontalPadding];
    const paddingTopClassName = PADDING_TOP_CLASSNAMES[paddingTop];
    const paddingBottomClassName = PADDING_BOTTOM_CLASSNAMES[paddingBottom];

    return (
        <div
            {...defaultAttributes}
            className={clsx(
                backgroundColorClassName,
                defaultAttributes?.className,
            )}
        >
            <div
                className={clsx({
                    container: width === 'contained',
                    'mt-[calc(-1*var(--main-nav-height))]': !!navigationInset,
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
