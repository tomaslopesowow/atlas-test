import type { JSX } from 'react';
import { SvgIcon, type SvgIconProps } from '@/components/icons/svg-icon';

export const CursorPulse = (_props: SvgIconProps): JSX.Element => {
    return (
        <SvgIcon {..._props} viewBox="0 0 27 30">
            <circle
                cx="13.4997"
                cy="13.4997"
                r="8.30435"
                stroke="currentColor"
                strokeOpacity="0.1"
                fill="none"
            />
            <circle
                cx="13.5"
                cy="13.5"
                r="13"
                stroke="currentColor"
                strokeOpacity="0.1"
                fill="none"
            />
            <path d="M15.0472 14.9658L8.57126 28.7813C8.37453 29.201 8.80534 29.6393 9.22837 29.4498L15.2956 26.7324C15.4257 26.6742 15.5743 26.6742 15.7044 26.7324L21.7716 29.4498C22.1947 29.6393 22.6255 29.201 22.4287 28.7813L15.9527 14.9658C15.7728 14.5821 15.2271 14.5821 15.0472 14.9658Z" />
        </SvgIcon>
    );
};

export default CursorPulse;
