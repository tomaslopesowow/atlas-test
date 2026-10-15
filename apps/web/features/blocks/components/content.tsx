import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { SectionHeading } from '@/components/common/section-heading';
import { LinkCMS } from '@/components/content/content-link';
import { MediaCMS } from '@/components/content/content-media';
import { LexicalRichText } from '@/components/content/lexical-node';
import { Button } from '@/features/shadcn/ui/button';
import { cn } from '@/features/shadcn/utils/ui';
import { Diorama } from '../../animation/components/diorama';

const TEXT_CENTERED = false;
const GAP_HORIZONTAL: string = 'lg:gap-x-12';
const MEDIA_BORDER_RADIUS: string = 'rounded-none';

defineBlockComponent({
    slug: 'content',
    component: ({ block }) => {
        return (
            <section
                className={cn(
                    'gap-y-12 grid grid-cols-12 w-full',
                    block.mediaPosition === 'right' && 'lg:flex-row-reverse',
                    block.textAlignment === 'top' && 'items-start',
                    block.textAlignment === 'center' && 'items-center',
                    block.textAlignment === 'bottom' && 'items-end',
                    GAP_HORIZONTAL,
                )}
            >
                {block.media &&
                    (block.media.type === 'image' ? (
                        <Diorama
                            className={cn(
                                block.mediaPosition === 'right' &&
                                    'col-start-7',
                                'col-span-12 lg:col-span-6 overflow-hidden',
                                MEDIA_BORDER_RADIUS,
                            )}
                        >
                            <MediaCMS
                                fadeIn={true}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                media={block.media}
                                className="size-full"
                            />
                        </Diorama>
                    ) : (
                        <MediaCMS
                            media={block.media}
                            className={cn(
                                block.mediaPosition === 'right' &&
                                    'col-start-7',
                                'overflow-hidden col-span-12 lg:col-span-6',
                                MEDIA_BORDER_RADIUS,
                            )}
                        />
                    ))}
                <div className="col-span-12 lg:col-span-4 lg:col-start-8 flex flex-col gap-8">
                    <div
                        className={cn(
                            'flex flex-col gap-6 items-start',
                            TEXT_CENTERED && 'text-center',
                        )}
                    >
                        <SectionHeading
                            eyebrow={block.eyebrow}
                            title={block.title}
                            variant="heading-5"
                            data-testid="content-block-heading"
                        />

                        <LexicalRichText
                            content={block.text}
                            className="!mx-0"
                        />
                    </div>

                    {block?.buttons && block.buttons.length > 0 && (
                        <div
                            className={cn(
                                'flex gap-4 flex-wrap items-center',
                                TEXT_CENTERED && 'justify-center',
                            )}
                        >
                            {block.buttons.map((button) => (
                                <Button
                                    key={button.id}
                                    variant={button.variant ?? 'secondary'}
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
});
