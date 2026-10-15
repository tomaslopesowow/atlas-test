import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { MediaCMS } from '@/components/content/content-media';
import { type HeadingVariantProps, Heading } from '@/components/common/heading';
import { Diorama } from '../../animation/components/diorama';
import { AnimatedHeading } from '../../animation/components/animated-heading';

defineBlockComponent({
    slug: 'text-on-media',
    component: ({ block: { media, title, eyebrow, variant, subtitle } }) => (
        <div className="h-svh relative">
            {media?.type === 'image' ? (
                <Diorama className="absolute inset-0 size-full">
                    <MediaCMS
                        media={media}
                        fadeIn={true}
                        className="size-full"
                    />
                </Diorama>
            ) : (
                <MediaCMS media={media} className="absolute inset-0" />
            )}
            <div className="flex flex-col items-center justify-center h-full gap-y-16 text-center text-white">
                <h3 className="sr-only">
                    {eyebrow ? `${eyebrow}: ${title}` : title}
                </h3>
                <AnimatedHeading variant="base" as="p">
                    {eyebrow}
                </AnimatedHeading>
                <AnimatedHeading
                    variant={variant as HeadingVariantProps['variant']}
                    className="uppercase max-w-4xl text-center"
                    as="p"
                >
                    {title}
                </AnimatedHeading>
            </div>
            {subtitle && (
                <Heading
                    variant="base"
                    className="text-white absolute bottom-10 left-1/2 -translate-x-1/2"
                >
                    {subtitle}
                </Heading>
            )}
        </div>
    ),
});
