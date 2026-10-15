'use client';
import Icon from '@/components/icons/icon';
import {
    Sheet,
    SheetBody,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/features/shadcn/ui/sheet.dynamic';
import type { DialogProps } from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { type PropsWithChildren, useRef } from 'react';
import { getChildByType } from 'react-nanny';
import { ProductFilters } from './product-filters';

export const ProductFilterDialog = ({
    children,
    open,
    onOpenChange,
}: PropsWithChildren<Pick<DialogProps, 'open' | 'onOpenChange'>>) => {
    const t = useTranslations('ecommerce.product-filters');
    const doRender = useRef(false);
    const filterNode = getChildByType(children, ProductFilters);

    // Render the cart when it has been opened once
    doRender.current = open ? true : doRender.current;

    // don't render cart if it's not opened
    if (!doRender.current) return;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTitle className="sr-only">{t('filters')}</SheetTitle>

            <SheetDescription className="sr-only">
                {t('filters')}
            </SheetDescription>

            <SheetContent className="flex flex-col w-full sm:w-96">
                <SheetHeader className="flex justify-between">
                    <SheetTitle>{t('filters')}</SheetTitle>

                    <SheetClose>
                        <Icon name="close" />
                    </SheetClose>
                </SheetHeader>

                <SheetBody>{filterNode}</SheetBody>
            </SheetContent>
        </Sheet>
    );
};
