import type { JSX } from 'react';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';

export const Filter = (props: SvgIconProps): JSX.Element => {
    return (
        <SvgIcon {...props} width="15" height="10" viewBox="0 0 15 10">
            <path d="M3.33333 9.58333V7.91667H0V6.66667H3.33333V5H4.58333V9.58333H3.33333ZM6.66667 7.91667V6.66667H14.5833V7.91667H6.66667ZM10 4.58333V0H11.25V1.66667H14.5833V2.91667H11.25V4.58333H10ZM0 2.91667V1.66667H7.91667V2.91667H0Z" />
        </SvgIcon>
    );
};

export default Filter;
