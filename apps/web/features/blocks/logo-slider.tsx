import { ImageCMS } from '@/components/content/content-image';
import { LinkCMS } from '@/components/content/content-link';
import { Marquee } from '@/features/animation/components/marquee';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { createImageField } from '@/features/payload/fields/image';
import { createLinkField } from '@/features/payload/fields/link';
import { cn } from '@/features/shadcn/utils/ui';

const GRAYSCALE = false;
const HAS_LINK = true;
const SPEED = 0.06;
const SCROLL_VELOCITY = 0.02;
const DRAGGABLE = true;
const PAUSE_ON_MOUSE_ENTER = true;
const DIRECTION: 'ltr' | 'rtl' = 'ltr';

blocksRegistry.addBlock({
    block: {
        slug: 'logo-slider',
        imageURL: '/admin-assets/block-thumbnails/logo-slider.png',
        fields: [
            {
                name: 'logos',
                type: 'array',
                fields: [
                    createImageField(),
                    {
                        name: 'height',
                        type: 'number',
                        min: 10,
                        max: 100,
                        defaultValue: 20,
                        admin: {
                            description: 'Logo height',
                        },
                    },
                    createLinkField(),
                ],
            },
        ],
    },

    component: ({ block: { logos } }) => (
        <Marquee
            speed={SPEED}
            scrollVelocity={SCROLL_VELOCITY}
            draggable={DRAGGABLE}
            pauseOnMouseEnter={PAUSE_ON_MOUSE_ENTER}
            direction={DIRECTION}
            tabIndex={-1}
        >
            <div className="flex justify-center items-center w-full">
                {logos?.map(({ id, image, height, link }) => {
                    const logoImage = (
                        <ImageCMS
                            key={id}
                            image={image}
                            style={{
                                height: height ? `${height / 10}rem` : '2rem',
                            }}
                            className={cn(
                                'w-auto ml-32',
                                GRAYSCALE && 'grayscale',
                            )}
                            sizes="8rem"
                        />
                    );
                    return link?.type !== 'none' && HAS_LINK ? (
                        <LinkCMS key={id} link={link} tabIndex={-1}>
                            {logoImage}
                        </LinkCMS>
                    ) : (
                        logoImage
                    );
                })}
            </div>
        </Marquee>
    ),
});
