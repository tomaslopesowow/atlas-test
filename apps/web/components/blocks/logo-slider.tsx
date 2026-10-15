import { Marquee } from '@/features/animation/components/marquee';
import { blocksRegistry } from '@/features/blocks/registry';
import { LogoSlider } from '@/features/payload/blocks/logo-slider';
import { ImageCMS } from '../content/content-image';
import { LinkCMS } from '../content/content-link';
import { cn } from '../utils/ui';

const GRAYSCALE = false;
const HAS_LINK = true;
const SPEED = 0.06;
const SCROLL_VELOCITY = 0.02;
const DRAGGABLE = true;
const PAUSE_ON_MOUSE_ENTER = true;
const DIRECTION: 'ltr' | 'rtl' = 'ltr';

blocksRegistry.addBlock(LogoSlider.slug, {
    component: ({ block: { logos } }) => (
        <Marquee
            speed={SPEED}
            scrollVelocity={SCROLL_VELOCITY}
            draggable={DRAGGABLE}
            pauseOnMouseEnter={PAUSE_ON_MOUSE_ENTER}
            direction={DIRECTION}
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
                        <LinkCMS key={id} link={link}>
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
