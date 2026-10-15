export const LAYOUT_MODES = ['grid', 'list'] as const;
export const SORT_OPTIONS = ['year', '-year', 'name', '-name'] as const;
export const RESALE_SORT_OPTIONS = [
    ...SORT_OPTIONS,
    'price',
    '-price',
] as const;
export const FILTER_OPTIONS: OverviewFilterOption[] = [
    {
        name: 'length',
        min: 0,
        max: 200,
        unit: 'm',
        increment: 5,
        includeUnitInValue: true,
    },
    {
        name: 'year',
        min: 1940,
        max: new Date().getFullYear(),
        unit: 'y',
        increment: 1,
        includeUnitInValue: false,
    },
];

const formatPrice = (value: number) =>
    new Intl.NumberFormat('nl-NL').format(value);

export const PRICE_FILTER_OPTION: OverviewFilterOption = {
    name: 'price',
    min: 0,
    max: 100_000_000,
    unit: '€',
    increment: 1_000_000,
    includeUnitInValue: true,
    formatDisplayValue: formatPrice,
};

export type OverviewFilters = Record<string, [number, number]>;

export interface OverviewFilterOption {
    name: string;
    min: number;
    max: number;
    unit?: string;
    increment?: number;
    includeUnitInValue?: boolean;
    formatDisplayValue?: (value: number) => string;
}
