import { Checkbox } from '@/components/ui/checkbox';
import { useCallback, useId } from 'react';
import { setFilterAction, useProductFilter } from './product-filter-context';

export type ProductFilter = {
    name: string;
    label: string;
    type: 'checkbox';
};

export type ProductFiltersProps = {
    filters: ProductFilter[];
};

export const ProductFilters = ({ filters }: ProductFiltersProps) => {
    return (
        <div className="flex flex-col gap-1 py-2">
            {filters.map((filter) => (
                <ProductFilterCheckbox
                    key={filter.name}
                    name={filter.name}
                    label={filter.label}
                />
            ))}
        </div>
    );
};

const ProductFilterCheckbox = ({
    name,
    label,
}: Omit<ProductFilter, 'type'>) => {
    const { dispatch, state } = useProductFilter();
    const id = `productFilters.${name}.${useId()}`;

    const handleChange = useCallback(
        (checked: boolean) => {
            dispatch(setFilterAction(name, checked ? 'on' : ''));
        },
        [dispatch, name],
    );

    return (
        <div className="flex items-center gap-2" key={name}>
            <Checkbox
                id={id}
                name={name}
                onCheckedChange={handleChange}
                checked={state.filter?.[name] === 'on'}
            />
            <label htmlFor={id}>{label}</label>
        </div>
    );
};
