import Heading from '@/components/common/heading';
import { Image, Money } from '@shopify/hydrogen-react';
import { clsx } from 'clsx';
import { readFragment } from 'gql.tada';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ImageFragment } from '../api/fragments/media';
import { MoneyFragment } from '../api/fragments/money';
import { ProductListItem } from '../api/fragments/product-listitem.storefront';
import { ProductVariantFragment } from '../api/fragments/product-variant.storefront';

export interface ShopifyProductCardProps {
    product: ProductListItem; // The product data from Shopify
    className?: string;
}

export const ShopifyProductCard = ({
    product: productFragment,
    className,
}: ShopifyProductCardProps) => {
    const locale = useLocale();
    const product = readFragment(ProductListItem, productFragment);

    if (!product) return null;

    const { title, handle } = product;

    const selectedOrFirstAvailableVariant = readFragment(
        ProductVariantFragment,
        product.selectedOrFirstAvailableVariant,
    );

    const featuredImage = readFragment(ImageFragment, product.featuredImage);

    return (
        <div className={clsx('flex flex-col relative', className)}>
            {/* Product Image */}
            <div className="overflow-hidden rounded-md aspect-[3/4] mb-4 bg-gray-background2">
                {featuredImage ? (
                    <Image
                        data={featuredImage}
                        className="object-cover w-full h-full"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-background2">
                        <span className="sr-only">No image</span>
                    </div>
                )}
            </div>

            {/* Product Title - Clickable */}
            <Heading asChild variant="heading-6">
                <Link
                    href={`/${locale}/${handle}`}
                    className="text-gray-text12 hover:underline"
                >
                    <span className="absolute inset-0" />
                    {title}
                </Link>
            </Heading>

            {/* Product Price */}
            <div className="mt-2 flex items-center">
                {selectedOrFirstAvailableVariant?.price && (
                    <Money
                        data={readFragment(
                            MoneyFragment,
                            selectedOrFirstAvailableVariant.price,
                        )}
                        className="text-base font-semibold"
                    />
                )}

                {/* Compare At Price (strikethrough) */}
                {selectedOrFirstAvailableVariant?.compareAtPrice && (
                    <Money
                        data={readFragment(
                            MoneyFragment,
                            selectedOrFirstAvailableVariant.compareAtPrice,
                        )}
                        className="ml-2 text-sm text-gray-text11 line-through"
                    />
                )}
            </div>
        </div>
    );
};
