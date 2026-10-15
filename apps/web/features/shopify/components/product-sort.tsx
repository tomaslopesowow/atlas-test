import type { SelectProps } from '@radix-ui/react-select';
import { useTranslations } from 'next-intl';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/features/shadcn/ui/select';
import { setSortAction, useProductFilter } from './product-filter-context';

export const ProductSort = ({
    defaultSort,
    ...props
}: Omit<SelectProps, 'value' | 'onValueChange'> & {
    defaultSort?: string;
}) => {
    const t = useTranslations('ecommerce.product-sort');
    const { state, dispatch } = useProductFilter();

    return (
        <Select
            {...props}
            value={state.sort ?? defaultSort}
            onValueChange={(value) => dispatch(setSortAction(value))}
        >
            <SelectTrigger className="w-48 gap-1">
                <SelectValue placeholder={t('sort-by')} />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value="best-selling">
                    {t('best-selling')}
                </SelectItem>
                <SelectItem value="price">{t('price-low-to-high')}</SelectItem>
                <SelectItem value="-price">{t('price-high-to-low')}</SelectItem>
                <SelectItem value="title">{t('title-a-z')}</SelectItem>
                <SelectItem value="-title">{t('title-z-a')}</SelectItem>
                <SelectItem value="manual">{t('featured')}</SelectItem>
            </SelectContent>
        </Select>
    );
};
