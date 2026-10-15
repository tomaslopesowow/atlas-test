'use client';
import Icon from '@/components/common/icon';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetBody,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet.dynamic';
import { useSettings } from '@/features/payload/components/settings-context';
import { asDoc } from '@/features/payload/utils/as-doc';
import { CartCost, useCart } from '@shopify/hydrogen-react';
import { CartLineProvider } from '@shopify/hydrogen-react/CartLineProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';
import { useCartDialog } from './cart-dialog-context';
import { CartLine } from './cart-line';

export const CartDialog = () => {
    const t = useTranslations('cart');
    const cartDialog = useCartDialog();
    const cart = useCart();
    const doRenderCart = useRef(false);
    const settings = useSettings();
    const shopPage = asDoc(settings?.eCommerce?.shopPage);

    const handleOpenChange = useCallback(
        (isOpen: boolean) => (isOpen ? cartDialog.show() : cartDialog.hide()),
        [cartDialog],
    );

    // Render the cart when it has been opened once
    doRenderCart.current = cartDialog.isOpen ? true : doRenderCart.current;

    // don't render cart if it's not opened
    if (!doRenderCart.current) return;

    return (
        <Sheet open={cartDialog.isOpen} onOpenChange={handleOpenChange}>
            <SheetTitle className="sr-only">{t('cart')}</SheetTitle>

            <SheetDescription className="sr-only">
                {t('title', { count: cart.totalQuantity ?? 0 })}
            </SheetDescription>

            <SheetContent className="flex flex-col w-full sm:w-96">
                <SheetHeader className="flex justify-between">
                    <SheetTitle>
                        {t('title', { count: cart.totalQuantity ?? 0 })}
                    </SheetTitle>

                    <SheetClose>
                        <Icon name="close" />
                    </SheetClose>
                </SheetHeader>

                <SheetBody>
                    {!cart.totalQuantity && t('empty')}

                    <ul className="divide-y divide-gray-200 -my-6">
                        {cart.lines?.map(
                            (line, index) =>
                                line && (
                                    <CartLineProvider
                                        key={[line?.id, index].join()}
                                        line={line}
                                    >
                                        <CartLine />
                                    </CartLineProvider>
                                ),
                        )}
                    </ul>
                </SheetBody>

                <SheetFooter>
                    <div className="flex justify-between text-base font-medium text-gray-900">
                        <p>{t('subtotal')}</p>
                        <CartCost amountType="subtotal" />
                    </div>

                    <p className="mt-0.5 text-sm text-gray-500">
                        {t('shippingCalculatedAtCheckout')}
                    </p>

                    <div className="mt-6 flex justify-center">
                        <Button size="lg" asChild className="w-full">
                            <a href={cart.checkoutUrl}>{t('checkout')}</a>
                        </Button>
                    </div>

                    {shopPage?.permalink && (
                        <div className="mt-2 flex justify-center">
                            <Button
                                type="button"
                                variant="link"
                                className="whitespace-pre"
                                asChild
                            >
                                <a href={shopPage.permalink}>{t('shopNow')}</a>
                            </Button>
                        </div>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
