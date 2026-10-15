import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@radix-ui/react-collapsible';
import {
    RadioGroup,
    RadioGroupIndicator,
    RadioGroupItem,
} from '@radix-ui/react-radio-group';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/features/shadcn/ui/button';
import Input from '@/features/shadcn/ui/input';
import {
    Sheet,
    SheetBody,
    SheetClose,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/features/shadcn/ui/sheet';
import { cn } from '@/features/shadcn/utils/ui';
import { Heading } from './heading';
import { Slider } from './slider';
import Close from '../icons/close';
import Minus from '../icons/minus';
import Plus from '../icons/plus';
import type { OverviewFilterOption, OverviewFilters } from './filter-shared';

export interface SortOption {
    name: string;
    label: string;
}

interface FilterSheetProps {
    open: boolean;
    onClose: () => void;

    filterOptions: OverviewFilterOption[];
    filters: OverviewFilters;

    sortOptions: SortOption[];
    sort?: string;

    onSubmit(state: { filters: OverviewFilters; sort?: string }): void;
}

const buildSliderValues = (
    filterOptions: OverviewFilterOption[],
    filters: OverviewFilters,
) =>
    filterOptions.reduce((acc, option) => {
        acc[option.name] = filters[option.name] ?? [option.min, option.max];
        return acc;
    }, {} as OverviewFilters);

const stripDefaults = (
    filterOptions: OverviewFilterOption[],
    values: OverviewFilters,
): OverviewFilters => {
    const result = { ...values };
    for (const option of filterOptions) {
        const value = result[option.name];
        if (value && value[0] === option.min && value[1] === option.max) {
            delete result[option.name];
        }
    }
    return result;
};

export const FilterSheet = ({
    open,
    onClose,

    filterOptions,
    filters,

    sortOptions,
    sort,

    onSubmit,
}: FilterSheetProps) => {
    const t = useTranslations('Filter');

    const [sliderValues, setSliderValues] = useState<OverviewFilters>(
        buildSliderValues(filterOptions, filters),
    );
    const [selectedSort, setSelectedSort] = useState<string | undefined>(sort);

    // biome-ignore lint/correctness/useExhaustiveDependencies: build function is stable
    useEffect(() => {
        setSliderValues(buildSliderValues(filterOptions, filters));
    }, [filters]);

    useEffect(() => {
        setSelectedSort(sort);
    }, [sort]);
    const [activeCollapsibleIndex, setActiveCollapsibleIndex] = useState<
        number | null
    >(null);

    // https://github.com/radix-ui/primitives/issues/1760#issuecomment-1764234638
    const unstableValueCommitsFallbacks = useRef<Record<string, number[]>>({});

    const handleSubmit = () => {
        onSubmit({
            filters: stripDefaults(filterOptions, sliderValues),
            sort: selectedSort,
        });
    };

    const handleClearAll = () => {
        const defaults: OverviewFilters = {};
        for (const option of filterOptions) {
            defaults[option.name] = [option.min, option.max];
        }
        setSliderValues(defaults);
        setSelectedSort(undefined);
    };

    const handleManualInputChange =
        (
            option: OverviewFilterOption,
            setter: (value: number) => [number, number],
        ): React.ChangeEventHandler<HTMLInputElement> =>
        (event) => {
            const raw = option.formatDisplayValue
                ? Number(event.currentTarget.value.replace(/\D/g, ''))
                : event.currentTarget.valueAsNumber;
            if (Number.isNaN(raw)) return;
            setSliderValues((prev) => ({
                ...prev,
                [option.name]: setter(raw),
            }));
        };

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent
                className="flex flex-col overflow-y-scroll"
                data-lenis-prevent
            >
                <SheetHeader className="flex justify-between">
                    <SheetTitle>{t('filter')}</SheetTitle>
                    <SheetClose>
                        <Close className="size-3" />
                    </SheetClose>
                </SheetHeader>

                <SheetBody className="px-8 pt-4">
                    <Collapsible className="border-b border-secondary">
                        <CollapsibleTrigger className="py-8 w-full flex justify-between group">
                            <Heading variant="base" className="text-xs">
                                {t('sortBy')}
                            </Heading>
                            <Plus className="size-3 group-data-[state=open]:hidden" />
                            <Minus className="size-3 hidden group-data-[state=open]:block" />
                        </CollapsibleTrigger>

                        <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
                            <RadioGroup
                                className="flex flex-col gap-y-4 pb-10"
                                onValueChange={setSelectedSort}
                            >
                                {sortOptions.map((option) => (
                                    <div
                                        className="flex items-center gap-x-3"
                                        key={option.name}
                                    >
                                        <RadioGroupItem
                                            value={option.name}
                                            id={option.name}
                                            className="size-5 rounded-full border-2 border-primary relative data-[state=checked]:border-tertiary"
                                            checked={
                                                selectedSort === option.name
                                            }
                                        >
                                            <RadioGroupIndicator className="size-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-invert rounded-full" />
                                        </RadioGroupItem>
                                        <label
                                            htmlFor={option.name}
                                            className="leading-none text-sm cursor-pointer"
                                        >
                                            {option.label}
                                        </label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </CollapsibleContent>
                    </Collapsible>

                    {filterOptions.map((option, index) => {
                        const sliderValue = sliderValues[option.name];
                        if (!sliderValue) return null;

                        return (
                            <Collapsible
                                key={`${option.name}.${index}`}
                                className="border-b border-secondary"
                            >
                                <CollapsibleTrigger className="py-8 w-full flex justify-between group">
                                    <Heading variant="base" className="text-xs">
                                        {t(option.name)}
                                    </Heading>
                                    <Plus className="size-3 group-data-[state=open]:hidden" />
                                    <Minus className="size-3 hidden group-data-[state=open]:block" />
                                </CollapsibleTrigger>

                                <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
                                    <div className="pb-10 gap-y-6 flex flex-col">
                                        <Slider
                                            min={option.min}
                                            max={option.max}
                                            value={sliderValue}
                                            step={option.increment}
                                            isRange
                                            onValueChange={(value) => {
                                                setSliderValues((prev) => ({
                                                    ...prev,
                                                    [option.name]: value as [
                                                        number,
                                                        number,
                                                    ],
                                                }));
                                                unstableValueCommitsFallbacks.current[
                                                    option.name
                                                ] = value;
                                            }}
                                            onValueCommit={(value) => {
                                                setSliderValues((prev) => ({
                                                    ...prev,
                                                    [option.name]: value as [
                                                        number,
                                                        number,
                                                    ],
                                                }));
                                            }}
                                            onPointerLeave={() => {
                                                const fallback =
                                                    unstableValueCommitsFallbacks
                                                        .current[option.name];
                                                if (fallback) {
                                                    setSliderValues((prev) => ({
                                                        ...prev,
                                                        [option.name]:
                                                            fallback as [
                                                                number,
                                                                number,
                                                            ],
                                                    }));
                                                }
                                            }}
                                        />

                                        <div className="w-full flex justify-between items-center gap-x-2 md:gap-x-12">
                                            <Input
                                                type={
                                                    option.formatDisplayValue
                                                        ? 'text'
                                                        : 'number'
                                                }
                                                inputClassName="px-0 text-end"
                                                className="border-2 border-primary px-4 py-2 focus-within:border-tertiary transition-colors duration-500 grow"
                                                value={
                                                    option.formatDisplayValue
                                                        ? option.formatDisplayValue(
                                                              sliderValue[0],
                                                          )
                                                        : sliderValue[0]
                                                }
                                                prepend={
                                                    <span className="text-sm text-body">
                                                        {option.unit?.toUpperCase()}
                                                    </span>
                                                }
                                                min={option.min}
                                                max={option.max}
                                                onFocus={() =>
                                                    setActiveCollapsibleIndex(
                                                        index,
                                                    )
                                                }
                                                onBlur={() => {
                                                    setActiveCollapsibleIndex(
                                                        null,
                                                    );
                                                }}
                                                onChange={handleManualInputChange(
                                                    option,
                                                    (value: number) => [
                                                        value,
                                                        sliderValue[1],
                                                    ],
                                                )}
                                            />
                                            <div
                                                className={cn(
                                                    'w-4 h-px bg-border-primary transition-colors duration-500 hidden md:block',
                                                    activeCollapsibleIndex ===
                                                        index && 'bg-invert',
                                                )}
                                            />
                                            <Input
                                                type={
                                                    option.formatDisplayValue
                                                        ? 'text'
                                                        : 'number'
                                                }
                                                value={
                                                    option.formatDisplayValue
                                                        ? option.formatDisplayValue(
                                                              sliderValue[1],
                                                          )
                                                        : sliderValue[1]
                                                }
                                                inputClassName="px-0 text-end"
                                                className="border-2 border-primary px-4 py-2 focus-within:border-tertiary transition-colors duration-500 grow"
                                                prepend={
                                                    <span className="text-sm text-body">
                                                        {option.unit?.toUpperCase()}
                                                    </span>
                                                }
                                                min={option.min}
                                                max={option.max}
                                                onFocus={() =>
                                                    setActiveCollapsibleIndex(
                                                        index,
                                                    )
                                                }
                                                onBlur={() => {
                                                    setActiveCollapsibleIndex(
                                                        null,
                                                    );
                                                }}
                                                onChange={handleManualInputChange(
                                                    option,
                                                    (value: number) => [
                                                        sliderValue[0],
                                                        value,
                                                    ],
                                                )}
                                            />
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </SheetBody>

                <SheetFooter className="grid grid-cols-3 gap-2 p-8 self-end w-full border-none">
                    <Button
                        variant="secondary"
                        className="w-full col-span-3 md:col-span-1"
                        onClick={handleClearAll}
                    >
                        {t('clearAll')}
                    </Button>
                    <SheetClose asChild>
                        <Button
                            variant="primary"
                            className="w-full col-span-3 md:col-span-2"
                            onClick={handleSubmit}
                        >
                            {t('show')}
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
