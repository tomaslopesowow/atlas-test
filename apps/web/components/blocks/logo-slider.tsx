import { Marquee } from '@/features/animation/components/marquee';
import { blocksRegistry } from '@/features/blocks/registry';
import { LogoSlider } from '@/features/payload/blocks/logo-slider';
import { ImageCMS } from '../content/content-image';
import { LinkCMS } from '../content/content-link';
import { cn } from '../utils/ui';

const DEFAULT_CONFIG: LogoSliderConfig = {
    grayscale: false,
    hasLink: true,
    speed: 0.06,
    scrollVelocity: 0.02,
    draggable: true,
    pauseOnMouseEnter: true,
    direction: 'ltr',
};

interface LogoSliderConfig {
    grayscale?: boolean;
    hasLink?: boolean;
    speed?: number;
    scrollVelocity?: number;
    draggable?: boolean;
    pauseOnMouseEnter?: boolean;
    direction?: 'ltr' | 'rtl';
}

blocksRegistry.addBlock<typeof LogoSlider.slug, LogoSliderConfig>(
    LogoSlider.slug,
    {
        component: ({ block, extra }) => {
            const config: LogoSliderConfig = {
                ...DEFAULT_CONFIG,
                ...extra,
            };

            return (
                <Marquee
                    key={`${config.speed}-${config.scrollVelocity}-${config.draggable}-${config.pauseOnMouseEnter}-${config.direction}`}
                    speed={config.speed}
                    scrollVelocity={config.scrollVelocity}
                    draggable={config.draggable}
                    pauseOnMouseEnter={config.pauseOnMouseEnter}
                    direction={config.direction}
                >
                    <div className="flex items-center gap-32 px-16">
                        {block.logos?.map(({ id, image, height, link }) => {
                            const logoImage = (
                                <ImageCMS
                                    key={id}
                                    image={image}
                                    style={{
                                        height: height
                                            ? `${height / 10}rem`
                                            : '2rem',
                                    }}
                                    className={cn(
                                        'w-auto',
                                        config.grayscale && 'grayscale',
                                    )}
                                    sizes="8rem"
                                />
                            );
                            return link?.type !== 'none' && config.hasLink ? (
                                <LinkCMS key={id} link={link}>
                                    {logoImage}
                                </LinkCMS>
                            ) : (
                                logoImage
                            );
                        })}
                    </div>
                </Marquee>
            );
        },
    },
);
