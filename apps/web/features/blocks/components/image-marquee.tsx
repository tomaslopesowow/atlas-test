import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { useTranslations } from 'next-intl';
import { MediaCMS } from '@/components/content/content-media';
import type { MediaField } from '@/payload-types';
import { Marquee } from '../../animation/components/marquee';
import { asDoc } from '../../payload/utils/as-doc';
import type { Media } from '@/payload-types';

const MARQUEE_HEIGHT_REM = 40;
const MARQUEE_HEIGHT_MOBILE_REM = 20;

function validateImageWithDimensions(
    imageMedia: Media | null,
): imageMedia is Media & { width: number; height: number } {
    return !!imageMedia?.width && !!imageMedia?.height;
}

defineBlockComponent({
    slug: 'image-marquee',
    component: ({ block, page }) => {
        const t = useTranslations('common');

        function getContextualItems():
            | Array<{
                  media?: MediaField;
                  id?: string | null;
              }>
            | null
            | undefined {
            switch (page.taxonomyType) {
                case 'fleet': {
                    const items = page.taxonomyData?.fleet?.gallery?.map(
                        ({ id, image }) => ({
                            id,
                            media: {
                                image,
                                type: 'image' as const,
                            },
                        }),
                    );

                    // Move the first item to the end of the array,
                    // because in the page layout, the first item is showed in the footer too.
                    if (items && items.length > 1) {
                        // biome-ignore lint/style/noNonNullAssertion: we know it exists
                        items.push(items.shift()!);
                    }

                    return items ?? [];
                }

                default:
                    return [];
            }
        }

        const items = block.contextual ? getContextualItems() : block.items;

        return (
            <>
                <Marquee
                    className="pointer-chaser-container !cursor-none"
                    draggable={true}
                >
                    {items?.map((item, index) => {
                        const imageMedia = asDoc(item.media?.image?.media);

                        const isImageWithDimensions =
                            validateImageWithDimensions(imageMedia);

                        const aspectRatio = isImageWithDimensions
                            ? imageMedia.width / imageMedia.height
                            : 9 / 16;

                        return (
                            <div
                                key={`${item.id}-${index}`}
                                style={
                                    {
                                        '--marquee-height': `${MARQUEE_HEIGHT_REM}rem`,
                                        '--marquee-height-mobile': `${MARQUEE_HEIGHT_MOBILE_REM}rem`,
                                        '--aspect': `${aspectRatio}`,
                                    } as React.CSSProperties
                                }
                                className="flex-none pl-4 min-w-0 marquee-item"
                            >
                                <MediaCMS
                                    media={item.media}
                                    className="block h-full w-full"
                                    sizes="80vw"
                                />
                            </div>
                        );
                    })}
                </Marquee>
                <div className="flex items-center justify-center size-20 rounded-full bg-white pointer-chaser -top-10 -left-10">
                    <p className="text-xs font-sweet-sans-pro uppercase text-dark-blue">
                        {t('drag')}
                    </p>
                </div>
            </>
        );
    },
});
