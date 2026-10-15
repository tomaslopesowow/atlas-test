import type { JSX } from 'react';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';

export const Minus = (props: SvgIconProps): JSX.Element => {
    return (
        <SvgIcon {...props} width="11" height="2" viewBox="0 0 11 2">
            <path d="M0.75 1.5C0.5375 1.5 0.359417 1.42808 0.21575 1.28425C0.0719168 1.14042 0 0.96225 0 0.74975C0 0.537083 0.0719168 0.359 0.21575 0.2155C0.359417 0.0718332 0.5375 0 0.75 0H10.25C10.4625 0 10.6406 0.0719168 10.7843 0.21575C10.9281 0.359583 11 0.53775 11 0.75025C11 0.962917 10.9281 1.141 10.7843 1.2845C10.6406 1.42817 10.4625 1.5 10.25 1.5H0.75Z" />
        </SvgIcon>
    );
};

export default Minus;
