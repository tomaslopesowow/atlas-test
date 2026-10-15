'use client';
import '@/components/blocks/logo-slider';
import { blocksRegistry } from '@/features/blocks/registry';
import type { Page } from '@/payload-types';
import { useFixtureSelect } from 'react-cosmos/client';

export const mockLogoSliderBlock = {
    id: 'logo-slider-block',
    blockType: 'logo-slider' as const,
    sectionTitle: 'Logo Slider',
    logos: [
        {
            id: 'logo-1',
            image: {
                media: {
                    id: 'logo-1',
                    filename: 'gemeente-eindhoven.svg',
                    mimeType: 'image/svg+xml',
                    filesize: 1000,
                    width: 100,
                    height: 100,
                    url: 'https://urban-engine-website-main.ams3.digitaloceanspaces.com/gemeente-eindhoven.svg',
                    description: 'Logo 1',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                    createdAt: '2024-01-01T00:00:00.000Z',
                },
                objectFit: 'contain',
                objectPosition: 'center',
                imagePreload: false,
            },
            height: 20,
            link: {
                type: 'none',
                url: '',
            },
        },
        {
            id: 'logo-2',
            image: {
                media: {
                    id: 'logo-2',
                    filename: 'bakkers-hommen.svg',
                    mimeType: 'image/svg+xml',
                    filesize: 1000,
                    width: 100,
                    height: 100,
                    url: 'https://urban-engine-website-main.ams3.digitaloceanspaces.com/bakkers-hommen.svg',
                    description: 'Logo 2',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                    createdAt: '2024-01-01T00:00:00.000Z',
                },
                objectFit: 'contain',
                objectPosition: 'center',
                imagePreload: false,
            },
            height: 25,
            link: {
                type: 'url',
                url: 'https://example.com',
            },
        },
    ],
};

export const Fixture = () => {
    const [GRAYSCALE] = useFixtureSelect('GrayScale', {
        options: ['true', 'false'],
        defaultValue: 'false',
    });
    const [HAS_LINK] = useFixtureSelect('Has Link', {
        options: ['true', 'false'],
        defaultValue: 'false',
    });
    const [SPEED] = useFixtureSelect('Speed', {
        options: ['0.06', '0.07', '0.08', '0.09'],
        defaultValue: '0.06',
    });
    const [SCROLL_VELOCITY] = useFixtureSelect('Scroll Velocity', {
        options: ['0.02', '0.03', '0.04', '0.05'],
        defaultValue: '0.02',
    });
    const [PAUSE_ON_MOUSE_ENTER] = useFixtureSelect('Pause On Mouse Enter', {
        options: ['true', 'false'],
        defaultValue: 'false',
    });
    const [DIRECTION] = useFixtureSelect('Direction', {
        options: ['ltr', 'rtl'],
        defaultValue: 'ltr',
    });

    const blockConfig = blocksRegistry.findBlock('blocks', 'logoSlider');

    if (!blockConfig) {
        return <div>Logo slider block not found in registry</div>;
    }

    const updatedBlock = {
        ...mockLogoSliderBlock,
        grayscale: GRAYSCALE === 'true',
        hasLink: HAS_LINK === 'true',
        speed: Number.parseFloat(SPEED),
        scrollVelocity: Number.parseFloat(SCROLL_VELOCITY),
        draggable: true,
        pauseOnMouseEnter: PAUSE_ON_MOUSE_ENTER === 'true',
        direction: DIRECTION as 'ltr' | 'rtl',
    };

    return (
        <div className="p-4">
            <blockConfig.component
                block={updatedBlock}
                pageProps={{
                    params: Promise.resolve({ locale: 'en' }),
                    searchParams: Promise.resolve({}),
                }}
                page={{} as Page}
                extra={{
                    grayscale: GRAYSCALE === 'true',
                    hasLink: HAS_LINK === 'true',
                    speed: Number.parseFloat(SPEED),
                    scrollVelocity: Number.parseFloat(SCROLL_VELOCITY),
                    draggable: true,
                    pauseOnMouseEnter: PAUSE_ON_MOUSE_ENTER === 'true',
                    direction: DIRECTION as 'ltr' | 'rtl',
                }}
            />
        </div>
    );
};

export default Fixture;
