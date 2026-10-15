import type { SvgIconProps } from '@/components/icons/svg-icon';
import { ICON_MAP } from '@/components/utils/icon-map';
import { cn } from '@/components/utils/ui';
import type { Maybe } from 'graphql/jsutils/Maybe';

import type { JSX } from 'react';

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
