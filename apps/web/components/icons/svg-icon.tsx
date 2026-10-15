import type { JSX, SVGAttributes } from 'react';

export type SvgIconProps = SVGAttributes<SVGSVGElement> & { title?: string };

/**
 * An SVG icon wrapper. Contains basic SVG element container to normalise usage.
 */
export const SvgIcon = ({
    children,
    title,
    ...props
}: SvgIconProps): JSX.Element => {
    return (
        <svg
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <title>{title || 'icon'}</title>
            {children}
        </svg>
    );
};

export default SvgIcon;
