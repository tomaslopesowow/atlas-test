'use client';

import { Image, Money, useCart, useProduct } from '@shopify/hydrogen-react';
import {
    Children,
    Fragment,
    type PropsWithChildren,
    useCallback,
    useMemo,
} from 'react';
import { Button } from '@/components/common/button';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from '@/components/common/carousel';
import Heading from '@/components/common/heading';
import { useCartDialog } from '@/features/shopify/components/cart-dialog-context';
// biome-ignore lint/suspicious/noTsIgnore: This can be toggled, so it should always be ignored
// @ts-ignore - this data is available when NEXT_PUBLIC_ECOMMERCE is enabled
import type { Page, ProductHeader } from '@/payload-types';

/**
 * Configuration for gallery images
 */
const GALLERY_IMAGE_PROPS = {
    aspectRatio: '3/4',
    className: 'object-cover',
    sizes: '(max-width: 992px) 100vw, 50vw',
};

export interface ProductHeaderProps {
    block: ProductHeader;
    page: Page;
}

/**
 * Product Header Client Component
 *
 * This client-side component renders the product details page header, including:
 * - Product image gallery with responsive layout (carousel on mobile, grid on desktop)
 * - Product title, price, and description
 * - Add to cart functionality
 * - Accordion sections for product details
 */
export const ProductHeaderClient = (props: ProductHeaderProps) => {
    const { messages, promotionalMessage } = props.block;
    const { taxonomyData: _ } = props.page;
    const cart = useCart();
    const cartDialog = useCartDialog();
    const { product, selectedVariant } = useProduct();

    /**
     * Formats the product title by combining product name and variant name if available
     */
    const title = useMemo(() => {
        return [product?.title, selectedVariant?.title]
            .filter(Boolean)
            .join(' / ');
    }, [product?.title, selectedVariant?.title]);

    /**
     * Handles adding the current product to the cart and shows the cart dialog
     */
    const addToCart = useCallback(() => {
        if (!selectedVariant?.id) return;

        cart.linesAdd([
            {
                merchandiseId: selectedVariant.id,
                quantity: 1,
            },
        ]);

        cartDialog.show();
    }, [selectedVariant?.id, cart, cartDialog]);

    return (
        <header className="py-12 md:py-16 lg:py-20">
            <div className="container">
                <div className="grid grid-cols-1 gap-y-8 md:gap-y-10 lg:grid-cols-[1.25fr_1fr] lg:gap-x-20">
                    {/* Product Image Gallery */}
                    <Gallery>
                        {/* Featured image is displayed first and larger */}
                        {product?.featuredImage && (
                            <Image
                                data={product.featuredImage}
                                {...GALLERY_IMAGE_PROPS}
                            />
                        )}

                        {/* Additional product images */}
                        {product?.images?.nodes
                            ?.filter(
                                (node) =>
                                    node?.id !== product?.featuredImage?.id,
                            )
                            .map((image) => (
                                <Image
                                    key={image?.id}
                                    data={image}
                                    {...GALLERY_IMAGE_PROPS}
                                />
                            ))}
                    </Gallery>

                    {/* Product Information Section */}
                    <div className="lg:sticky lg:top-20 h-min">
                        {/* Product Title */}
                        <Heading
                            variant="heading-1"
                            as="h1"
                            className="mb-2 leading-[1.2]"
                        >
                            {title}
                        </Heading>

                        {/* Product Price */}
                        {selectedVariant?.price && (
                            <Money
                                as="p"
                                className="mb-5 text-xl font-bold md:mb-6 md:text-2xl"
                                data={selectedVariant.price}
                            />
                        )}

                        {/* Product Description */}
                        <p
                            className="mb-5 md:mb-6"
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted HTML from Shopify
                            dangerouslySetInnerHTML={{
                                __html: product?.descriptionHtml ?? '',
                            }}
                        />

                        {/* Add to Cart Section */}
                        <div className="mb-8">
                            <div className="mb-4 mt-8 flex flex-col gap-y-4">
                                <Button variant="primary" onClick={addToCart}>
                                    {messages?.buy}
                                </Button>
                            </div>

                            {/* Promotional Message */}
                            <p className="text-center text-xs">
                                {promotionalMessage}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

/**
 * Gallery Component
 *
 * Renders product images in different layouts based on screen size:
 * - On mobile (<lg): Shows a carousel for all images
 * - On desktop (≥lg): Shows a grid with first image larger, spanning two columns
 *
 * @param children - The image components to display in the gallery
 */
const Gallery = ({ children }: PropsWithChildren) => {
    const childrenArray = Children.toArray(children);
    const [firstChild, ...restChildren] = childrenArray;

    return (
        <Fragment>
            {/* Render a carousel on mobile (<lg screens) */}
            <div className="grid grid-cols-1 -mx-8 lg:hidden">
                {childrenArray.length > 1 && (
                    <Carousel className="col-span-full">
                        <CarouselContent className="-ml-6">
                            {childrenArray.map((child, index) => (
                                <CarouselItem
                                    key={String(index)}
                                    className="pl-6 basis-full"
                                >
                                    {child}
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                )}

                {/* Single image case - no carousel needed */}
                {childrenArray.length === 1 && (
                    <div className="col-span-full lg:hidden">
                        <div className="basis-full">{firstChild}</div>
                    </div>
                )}
            </div>

            {/* Render a grid on desktop (>=lg screens) */}
            <div
                className="hidden lg:grid"
                style={{
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gridTemplateRows: 'min-content',
                    gridAutoRows: 'min-content',
                    gap: '1rem',
                }}
            >
                {/* First image spans full width */}
                {firstChild && <div className="col-span-2">{firstChild}</div>}

                {/* Remaining images in a two-column grid */}
                {restChildren.map((child, index) => (
                    <div key={String(index)}>{child}</div>
                ))}
            </div>
        </Fragment>
    );
};
