import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { AnimatedHeading } from '../../animation/components/animated-heading';
import { ImageCMS } from '@/components/content/content-image';
import { Heading } from '@/components/common/heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import Close from '@/components/icons/close';

defineBlockComponent({
    slug: 'logo-cards',
    component: ({ block: { eyebrow, title, items } }) => {
        return (
            <section className="flex flex-col gap-y-16 lg:gap-y-32">
                <div className="flex flex-col items-center gap-y-12">
                    <AnimatedHeading variant="base">{eyebrow}</AnimatedHeading>
                    <AnimatedHeading
                        variant="heading-4"
                        className="text-center"
                        as="h3"
                    >
                        {title}
                    </AnimatedHeading>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {items?.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col relative justify-center items-center aspect-[1.5] group
                            border-r border-b border-secondary 
                            max-lg:[&:nth-child(1n+1)]:border-l max-lg:[&:nth-child(-n+1)]:border-t
                            lg:max-xl:[&:nth-child(2n+1)]:border-l lg:max-xl:[&:nth-child(-n+2)]:border-t
                            xl:[&:nth-child(3n+1)]:border-l xl:[&:nth-child(-n+3)]:border-t"
                        >
                            <ImageCMS
                                image={item.logo}
                                className="w-full h-10 !object-contain grayscale opacity-30"
                            />
                            <div
                                className="flex-col gap-y-6 flex absolute inset-0 bg-invert p-6 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out will-change-auto"
                            >
                                <Heading
                                    as="h4"
                                    variant="heading-7"
                                    className="text-invert"
                                >
                                    {item.title}
                                </Heading>
                                <p className="text-invert-secondary text-xs sm:text-sm">
                                    {renderLexicalSimple(item.description)}
                                </p>
                            </div>
                            <div className="absolute bottom-6 right-6 border border-secondary size-10 flex items-center justify-center rounded-full">
                                <Close
                                    className="size-[0.625rem] rotate-45
                                group-hover:rotate-0 group-hover:text-invert transition-all duration-500 ease-in-out will-change-auto"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    },
});
