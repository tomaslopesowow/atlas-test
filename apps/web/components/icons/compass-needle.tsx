import type { JSX } from 'react';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';

export const CompassNeedle = (props: SvgIconProps): JSX.Element => {
    return (
        <SvgIcon {...props} viewBox="0 0 22 22">
            <path
                d="M11.683 20.443C11.4972 20.9717 10.7525 20.9799 10.5553 20.4554L7.0794 11.2112C7.02822 11.075 7.02822 10.925 7.0794 10.7888L10.5553 1.54464C10.7525 1.02012 11.4972 1.02826 11.683 1.55696L14.9302 10.8011C14.9754 10.9299 14.9754 11.0701 14.9302 11.1988L11.683 20.443Z"
                fill="currentColor"
            />
        </SvgIcon>
    );
};

export default CompassNeedle;
