import type { Maybe } from '@repo/lib/types/maybe';
import { cn } from '@repo/lib/utils/cn';
import type { JSX } from 'react';
import { ICON_MAP } from '@/icons/icon-map';
import type { SvgIconProps } from '@/icons/svg-icon';

export type IconName = keyof typeof ICON_MAP;

export type IconProps = Omit<SvgIconProps, 'name'> & {
    name: Maybe<IconName>;
};

/**
 * An component to render icons by with the given name.
 */
export const Icon = ({
    name,
    className,
    ...props
}: IconProps): JSX.Element | undefined => {
    if (!name) return;

    const Icon = ICON_MAP[name];

    if (!Icon) return;

    return <Icon {...props} className={cn('size-5', className)} />;
};

Icon.displayName = 'Icon';

export default Icon;
