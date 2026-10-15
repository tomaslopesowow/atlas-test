import { blocksRegistry } from '@/features/blocks/registry';
import { TestimonialsBlock } from '@/features/payload/blocks/testimonials-block';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { Person, Testimonial } from '@/payload-types';
import Heading from '../common/heading';
import { SectionHeading } from '../common/section-heading';
import { ImageCMS } from '../content/content-image';
import { LinkCMS } from '../content/content-link';
import { Button } from '../ui/button';
import {
    Carousel,
    CarouselContent,
    CarouselDots,
    CarouselItem,
} from '../ui/carousel';

const CAROUREL_OVERFLOW = true;
const CARD_COLOR = 'bg-surface-secondary';
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
        {/* <CarouselPrevious
            variant="secondary"
            className={`w-fit p-2 h-auto ${className}`}
        >
            <Icon name="chevronLeft" className="size-6" />
        </CarouselPrevious>
        <CarouselNext
            variant="secondary"
            className={`w-fit p-2 h-auto ${className}`}
        >
            <Icon name="chevronRight" className="size-6" />
        </CarouselNext> */}
    </>
);

blocksRegistry.addBlock(TestimonialsBlock.slug, {
    component: ({ block }) => {
        const testimonials =
            block.testimonials as TestimonialBlock['testimonials'];

        return (
            <section className="grid grid-cols-1">
                {testimonials.length > 0 && (
                    <Carousel
                        className="col-span-full gap-y-8 flex flex-col relative justify-start"
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
                                <div className="hidden md:flex items-center gap-x-2">
                                    <CarouselNavigation />
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
                                            className={`flex flex-col gap-y-4 w-full min-h-[25rem] ${CARD_COLOR} rounded-lg p-6 aspect-[3/4] justify-between`}
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
                                                        <Heading variant="heading-6">
                                                            {author?.name}
                                                        </Heading>
                                                        {author?.function &&
                                                            AUTHOR_TITLE && (
                                                                <p className="text-sm text-text-secondary">
                                                                    {
                                                                        author.function
                                                                    }
                                                                </p>
                                                            )}
                                                    </div>
                                                </div>
                                                {(LINK_TYPE as string) ===
                                                    'button' &&
                                                    testimonial?.link?.type !==
                                                        'none' && (
                                                        <Button
                                                            asChild
                                                            variant="link"
                                                            className="text-text-primary p-0"
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
                            <div className="flex justify-end gap-x-2 mt-2">
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
