'use client';

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@repo/ui/components/carousel';
import Heading from '@repo/ui/components/heading';
import { Icon } from '@repo/ui/icons/icon';
import type { Product } from '@/api/fragments/product.storefront';
import { ShopifyProductCard } from '@/components/product-card';

type RelatedProductsClientProps = {
    title?: string | null;
    relatedProducts: Product[];
};

export const RelatedProductsClient = ({
    title,
    relatedProducts,
}: RelatedProductsClientProps) => (
    <section className="grid grid-cols-1">
        {!!relatedProducts.length && (
            <Carousel className="col-span-full gap-y-8 flex flex-col">
                <div className="flex items-center justify-between">
                    <Heading variant="heading-5">{title}</Heading>
                    <div className="flex items-center gap-x-2">
                        <CarouselPrevious
                            variant="light"
                            className="w-fit p-2 h-auto"
                        >
                            <Icon name="chevronLeft" className="size-6" />
                        </CarouselPrevious>
                        <CarouselNext
                            variant="light"
                            className="w-fit p-2 h-auto"
                        >
                            <Icon name="chevronRight" className="size-6" />
                        </CarouselNext>
                    </div>
                </div>
                <CarouselContent className="-ml-6 flex" shouldOverflow={true}>
                    {relatedProducts.map((product) => (
                        <CarouselItem
                            key={product.id}
                            className="pl-6 basis-2/3 md:basis-1/3 lg:basis-1/4"
                        >
                            <ShopifyProductCard product={product} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        )}
    </section>
);
