import type { JSX } from 'react';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';

export const ArrowRight = (props: SvgIconProps): JSX.Element => {
    return (
        <SvgIcon {...props}>
            <path d="M13.8558 10.625L3.75002 10.625V9.375L13.8558 9.375L9.10899 4.62819L9.99999 3.75L16.25 9.99998L9.99999 16.25L9.10899 15.3718L13.8558 10.625Z" />
        </SvgIcon>
    );
};

export default ArrowRight;
