import { blocksRegistry } from '@/features/blocks/registry';
import { ContentBlock } from '@/features/payload/blocks/content-block';
import Heading from '../common/heading';
import { LinkCMS } from '../content/content-link';
import { MediaCMS } from '../content/content-media';
import { LexicalRichText } from '../content/lexical-node';
import { Button } from '../ui/button';
import { cn } from '../utils/ui';

const DEFAULT_CONFIG = {
    textAlignment: 'top' as const,
    textCentered: false,
    gapHorizontal: 'gap-x-12',
    mediaAspectRatio: 'aspect-[4/3] md:aspect-[3/4]',
    mediaBorderRadius: 'rounded-lg',
};
interface ContentBlockConfig {
    textAlignment?: 'top' | 'center' | 'bottom';
    textCentered?: boolean;
    gapHorizontal?: string;
    mediaAspectRatio?: string;
    mediaBorderRadius?: string;
}

blocksRegistry.addBlock<typeof ContentBlock.slug, ContentBlockConfig>(
    ContentBlock.slug,
    {
        component: ({ block, extra }) => {
            const config: ContentBlockConfig = {
                ...DEFAULT_CONFIG,
                ...extra,
            };

            return (
                <section
                    className={cn(
                        'flex gap-y-12 flex-col lg:flex-row',
                        block.mediaPosition === 'right' &&
                            'lg:flex-row-reverse',
                        config.textAlignment === 'top' && 'items-start',
                        config.textAlignment === 'center' && 'items-center',
                        config.textAlignment === 'bottom' && 'items-end',
                        config.gapHorizontal,
                    )}
                >
                    {block.media && (
                        <MediaCMS
                            sizes="(max-width: 768px) 100vw, 50vw"
                            media={block.media}
                            className={cn(
                                block.mediaPosition === 'right' &&
                                    'col-start-7',
                                'w-full lg:w-1/2 overflow-hidden col-start-1 object-cover',
                                config.mediaBorderRadius,
                                config.mediaAspectRatio,
                            )}
                        />
                    )}
                    <div className="w-full lg:w-1/2 xl:row-start-1 xl:col-start-7 flex flex-col gap-8">
                        <div
                            className={cn(
                                'flex flex-col gap-6 items-start',
                                config.textCentered && 'text-center',
                            )}
                        >
                            {block.subtitle && (
                                <Heading as="h3" variant="base">
                                    {block.subtitle}
                                </Heading>
                            )}
                            {block.title && (
                                <Heading as="h2" variant="heading-2">
                                    {block.title}
                                </Heading>
                            )}
                            <LexicalRichText
                                content={block.text}
                                className="!mx-0"
                            />
                        </div>

                        {block?.buttons && block.buttons.length > 0 && (
                            <div
                                className={cn(
                                    'flex gap-4 flex-wrap',
                                    config.textCentered && 'justify-center',
                                )}
                            >
                                {block.buttons.map((button, index) => (
                                    <Button
                                        key={button.id}
                                        asChild
                                        variant={
                                            index === 0
                                                ? 'primary'
                                                : 'secondary'
                                        }
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
        },
    },
);
