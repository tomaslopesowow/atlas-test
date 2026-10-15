import Heading from '@/components/common/heading';
import { LinkCMS } from '@/components/content/content-link';
import { MediaCMS } from '@/components/content/content-media';
import { LexicalRichText } from '@/components/content/lexical-node';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utils/ui';
import type { Content } from '@/payload-types';

const TEXT_ALIGNMENT: string = 'top'; // 'top' | 'center' | 'bottom';
const TEXT_CENTERED = false;
const GAP_HORIZONTAL: string = 'gap-x-12';
const MEDIA_ASPECT_RATIO: string = 'aspect-[4/3] md:aspect-[3/4]';
const MEDIA_BORDER_RADIUS: string = 'rounded-lg';

type ExtendedContent = Content & {
    textAlignment?: 'top' | 'center' | 'bottom';
    textCentered?: boolean;
    gapHorizontal?: string;
    mediaAspectRatio?: string;
    mediaBorderRadius?: string;
};

export const ContentBlockLibrary = ({ block }: { block: ExtendedContent }) => {
    const textAlignment = block.textAlignment || TEXT_ALIGNMENT;
    const textCentered = block.textCentered ?? TEXT_CENTERED;
    const gapHorizontal = block.gapHorizontal || GAP_HORIZONTAL;
    const mediaAspectRatio = block.mediaAspectRatio || MEDIA_ASPECT_RATIO;
    const mediaBorderRadius = block.mediaBorderRadius || MEDIA_BORDER_RADIUS;

    return (
        <section
            className={cn(
                'flex gap-y-12 flex-col lg:flex-row',
                block.mediaPosition === 'right' && 'lg:flex-row-reverse',
                textAlignment === 'top' && 'items-start',
                textAlignment === 'center' && 'items-center',
                textAlignment === 'bottom' && 'items-end',
                gapHorizontal,
            )}
        >
            {block.media && (
                <MediaCMS
                    sizes="(max-width: 768px) 100vw, 50vw"
                    media={block.media}
                    className={cn(
                        block.mediaPosition === 'right' && 'col-start-7',
                        'w-full lg:w-1/2 overflow-hidden col-start-1',
                        mediaBorderRadius,
                        mediaAspectRatio,
                    )}
                />
            )}
            <div className="w-full lg:w-1/2 xl:row-start-1 xl:col-start-7 flex flex-col gap-8">
                <div
                    className={cn(
                        'flex flex-col gap-6 items-start',
                        textCentered && 'text-center',
                    )}
                >
                    {block.subtitle && (
                        <Heading as="h3" variant="sub-heading">
                            {block.subtitle}
                        </Heading>
                    )}
                    {block.title && (
                        <Heading as="h2" variant="heading-2">
                            {block.title}
                        </Heading>
                    )}
                    <LexicalRichText content={block.text} className="!mx-0" />
                </div>

                {block?.buttons && block.buttons.length > 0 && (
                    <div
                        className={cn(
                            'flex gap-4 flex-wrap',
                            textCentered && 'justify-center',
                        )}
                    >
                        {block.buttons.map((button, index) => (
                            <Button
                                key={button.id}
                                asChild
                                variant={index === 0 ? 'primary' : 'secondary'}
                                className="w-fit"
                            >
                                <LinkCMS link={button.link} />
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};
