import { cn } from '@repo/lib/utils/cn';
import { Button } from '@repo/ui/components/button';
import Heading from '@repo/ui/components/heading';
import Icon from '@repo/ui/icons/icon';
import { tv } from 'tailwind-variants';
import {
    Carousel,
    CarouselContent,
    CarouselDots,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/common/carousel';
import { SectionHeading } from '@/components/common/section-heading';
import { ImageCMS } from '@/components/content/content-image';
import { LinkCMS } from '@/components/content/content-link';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { Person, Testimonial } from '@/payload-types';

const CAROUREL_OVERFLOW = true;
const CARD_COLOR = 'bg-gray-background2';
const INDICATOR_DOTS = true;
const ARROW_BUTTONS = true;
const AUTHOR_IMAGE = true;
const AUTHOR_TITLE = true;
const LINK_TYPE: 'none' | 'button' | 'anchor' = 'none';

type TestimonialBlock = {
    testimonials: Testimonial[];
    author?: Person[] | null;
};

const CarouselNavigation = ({ className }: { className?: string }) => (
    <>
        <CarouselPrevious className={`w-fit p-2 h-auto ${className}`}>
            <Icon name="chevronLeft" className="size-6" />
        </CarouselPrevious>
        <CarouselNext className={`w-fit p-2 h-auto ${className}`}>
            <Icon name="chevronRight" className="size-6" />
        </CarouselNext>
    </>
);

const navigationVariants = tv({
    variants: {
        itemCount: {
            1: 'hidden',
            2: 'md:hidden',
            3: 'lg:hidden',
            4: 'xl:hidden',
            5: '',
        },
    },
}) as (props: { itemCount: number }) => string;

blocksRegistry.addBlock({
    block: {
        slug: 'testimonials-block',
        imageURL: '/admin-assets/block-thumbnails/testimonials-block.png',
        labels: {
            singular: 'Testimonial',
            plural: 'Testimonials',
        },

        fields: [
            {
                name: 'sectionTitle',
                type: 'text',
                localized: true,
            },
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'text',
                type: 'textarea',
                localized: true,
            },
            {
                name: 'testimonials',
                relationTo: 'testimonials',
                hasMany: true,
                type: 'relationship',
                admin: {
                    isSortable: true,
                },
            },
        ],
    },
    defaultAttributes: {
        className: 'overflow-hidden',
    },
    component: ({ block }) => {
        const testimonials =
            block.testimonials as TestimonialBlock['testimonials'];

        return (
            <section className="grid grid-cols-1">
                {testimonials.length > 0 && (
                    <Carousel
                        className="col-span-full gap-y-12 md:gap-y-16 xl:gap-y-20 flex flex-col relative justify-start"
                        opts={{
                            align: 'start',
                        }}
                    >
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-y-4 md:gap-y-0">
                            <div className="flex flex-col gap-y-2 w-full md:w-1/2">
                                <SectionHeading
                                    sectionTitle={block.sectionTitle}
                                    title={block.title}
                                    text={block.text}
                                />
                            </div>
                            {ARROW_BUTTONS && (
                                <div
                                    className={cn(
                                        navigationVariants({
                                            itemCount: Math.min(
                                                testimonials.length,
                                                5,
                                            ),
                                        }),
                                    )}
                                >
                                    <div className="hidden md:flex items-center gap-x-2">
                                        <CarouselNavigation />
                                    </div>
                                </div>
                            )}
                        </div>
                        <CarouselContent
                            className="-ml-6 flex"
                            shouldOverflow={CAROUREL_OVERFLOW}
                        >
                            {testimonials.map((testimonial) => {
                                const author = asDoc(testimonial?.author);

                                return (
                                    <CarouselItem
                                        key={testimonial?.id}
                                        className="relative pl-6 basis-3/4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                                    >
                                        {(LINK_TYPE as string) === 'anchor' &&
                                            testimonial?.link && (
                                                <LinkCMS
                                                    link={testimonial?.link}
                                                    className="w-full h-full absolute inset-0"
                                                >
                                                    {' '}
                                                </LinkCMS>
                                            )}
                                        <div
                                            className={`flex flex-col gap-y-4 w-full min-h-[25rem] ${CARD_COLOR} rounded-md p-6 aspect-[3/4] justify-between`}
                                        >
                                            <div className="flex flex-col gap-y-4">
                                                {testimonial?.logo?.media && (
                                                    <ImageCMS
                                                        image={testimonial.logo}
                                                        sizes="10rem"
                                                        className="w-1/2 object-contain"
                                                    />
                                                )}
                                                <div className="flex flex-col gap-y-2">
                                                    <p>
                                                        {testimonial?.content}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-y-4">
                                                <div className="flex gap-x-4 items-center">
                                                    {author?.image &&
                                                        AUTHOR_IMAGE && (
                                                            <ImageCMS
                                                                image={
                                                                    author.image
                                                                }
                                                                sizes="4rem"
                                                                className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover"
                                                            />
                                                        )}
                                                    <div className="flex flex-col gap-y-1">
                                                        <Heading
                                                            variant="heading-6"
                                                            as={
                                                                block.sectionTitle &&
                                                                block.title
                                                                    ? 'h4'
                                                                    : 'h3'
                                                            }
                                                        >
                                                            {author?.name}
                                                        </Heading>
                                                        {author?.function &&
                                                            AUTHOR_TITLE && (
                                                                <p className="text-sm text-gray-text11">
                                                                    {
                                                                        author.function
                                                                    }
                                                                </p>
                                                            )}
                                                    </div>
                                                </div>

                                                {testimonial?.link &&
                                                    testimonial?.link.type !==
                                                        'none' && (
                                                        <Button
                                                            asChild
                                                            variant="link"
                                                            className="text-primary p-0"
                                                        >
                                                            <LinkCMS
                                                                link={
                                                                    testimonial?.link
                                                                }
                                                            />
                                                        </Button>
                                                    )}
                                            </div>
                                        </div>
                                    </CarouselItem>
                                );
                            })}
                        </CarouselContent>

                        {INDICATOR_DOTS && (
                            <div
                                className={cn(
                                    'flex justify-end gap-x-2 mt-2',
                                    navigationVariants({
                                        itemCount: Math.min(
                                            testimonials.length,
                                            5,
                                        ),
                                    }),
                                )}
                            >
                                <CarouselDots className="hidden md:flex" />
                                {ARROW_BUTTONS && (
                                    <CarouselNavigation className="md:hidden" />
                                )}
                            </div>
                        )}
                    </Carousel>
                )}
            </section>
        );
    },
});
