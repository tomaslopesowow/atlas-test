import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';

import type { JSX } from 'react';

export const ArrowLeft = (props: SvgIconProps): JSX.Element => {
    return (
        <SvgIcon {...props}>
            <path d="M6.14421 9.37504L16.25 9.37504L16.25 10.625L6.14421 10.625L10.891 15.3718L10 16.25L3.75003 10L10 3.75004L10.891 4.62823L6.14421 9.37504Z" />
        </SvgIcon>
    );
};

export default ArrowLeft;
