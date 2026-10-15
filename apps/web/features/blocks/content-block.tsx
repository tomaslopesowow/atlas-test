import { SectionHeading } from '@/components/common/section-heading';
import { LinkCMS } from '@/components/content/content-link';
import { MediaCMS } from '@/components/content/content-media';
import { LexicalRichText } from '@/components/content/lexical-node';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { createLinkField } from '@/features/payload/fields/link';
import { createMediaField } from '@/features/payload/fields/media';
import { Button } from '@/features/shadcn/ui/button';
import { cn } from '@/features/shadcn/utils/ui';

const TEXT_ALIGNMENT = 'center' as 'top' | 'center' | 'bottom';
const TEXT_CENTERED = false;
const GAP_HORIZONTAL: string = 'gap-x-12';
const MEDIA_ASPECT_RATIO: string = 'aspect-[4/4]';
const MEDIA_BORDER_RADIUS: string = 'rounded-md';

blocksRegistry.addBlock({
    block: {
        slug: 'content',
        imageURL: '/admin-assets/block-thumbnails/content-block.jpg',
        labels: {
            singular: 'Content Block',
            plural: 'Content Blocks',
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
                type: 'richText',
                localized: true,
            },
            {
                name: 'buttons',
                type: 'array',
                maxRows: 2,
                fields: [
                    createLinkField(),
                    {
                        name: 'variant',
                        type: 'select',
                        options: ['default', 'primary', 'link'],
                        defaultValue: 'default',
                    },
                ],
            },
            {
                name: 'mediaPosition',
                type: 'select',
                options: ['left', 'right'],
                defaultValue: 'left',
            },
            createMediaField(),
        ],
    },

    component: ({ block }) => {
        return (
            <section
                className={cn(
                    'flex gap-y-12 flex-col lg:flex-row',
                    block.mediaPosition === 'right' && 'lg:flex-row-reverse',
                    TEXT_ALIGNMENT === 'top' && 'items-start',
                    TEXT_ALIGNMENT === 'center' && 'items-center',
                    TEXT_ALIGNMENT === 'bottom' && 'items-end',
                    GAP_HORIZONTAL,
                )}
            >
                {block.media && (
                    <MediaCMS
                        sizes="(max-width: 768px) 100vw, 50vw"
                        media={block.media}
                        className={cn(
                            block.mediaPosition === 'right' && 'col-start-7',
                            'w-full lg:w-1/2 overflow-hidden col-start-1',
                            MEDIA_BORDER_RADIUS,
                            MEDIA_ASPECT_RATIO,
                        )}
                    />
                )}
                <div className="w-full lg:w-1/2 xl:row-start-1 xl:col-start-7 flex flex-col gap-8">
                    <div
                        className={cn(
                            'flex flex-col gap-6 items-start',
                            TEXT_CENTERED && 'text-center',
                        )}
                    >
                        <SectionHeading
                            sectionTitle={block.sectionTitle}
                            title={block.title}
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
                                    asChild
                                    variant={button.variant ?? 'default'}
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
