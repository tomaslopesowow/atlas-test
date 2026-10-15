import type { JSX } from 'react';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';

export const X = (props: SvgIconProps): JSX.Element => {
    return (
        <SvgIcon {...props} viewBox="0 0 27 25">
            <path d="M21.1124 0.882813L25.1582 0.882813L16.3214 11.0098L26.7552 24.7422H18.5572L12.1692 16.4179L4.82289 24.7422H0.777127L10.2527 13.9259L0.244789 0.882812L8.65573 0.882813L14.4582 8.51781L21.1124 0.882813ZM19.6751 22.3032H21.9109L7.43135 3.16271L4.9826 3.16271L19.6751 22.3032Z" />
        </SvgIcon>
    );
};

export default X;
