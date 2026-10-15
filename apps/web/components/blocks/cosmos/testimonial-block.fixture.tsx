'use client';
import '@/components/blocks/testimonials-block';
import { blocksRegistry } from '@/features/blocks/registry';
import type { Page } from '@/payload-types';
import { useFixtureSelect } from 'react-cosmos/client';

const mockTestimonials = {
    id: 'fixture-testimonials-block',
    blockType: 'testimonials-block' as const,
    title: 'Testimonials',
    sectionTitle: 'Section title',
    text: 'What our clients say about us',
    testimonials: [
        {
            id: 'fixture-testimonial-1',
            content: 'This is a testimonial',
            author: {
                id: 'fixture-author-1',
                name: 'John Doe',
                function: 'CEO',
                bio: 'Experienced business leader with over 10 years in the industry.',
            },
            logo: {
                id: 'fixture-logo-1',
                media: {
                    id: 'fixture-media-1',
                    url: 'https://via.placeholder.com/150',
                    alt: 'Company Logo 1',
                    filename: 'logo1.png',
                    mimeType: 'image/png',
                    filesize: 15000,
                    width: 150,
                    height: 150,
                },
            },
        },
    ],
};

const Fixture = () => {
    const [CAROUSEL_OVERFLOW] = useFixtureSelect('Carousel Overflow', {
        options: ['true', 'false'],
        defaultValue: 'true',
    });
    const [CARD_COLOR] = useFixtureSelect('Card Color', {
        options: ['bg-surface-secondary', 'bg-surface-primary'],
        defaultValue: 'bg-surface-secondary',
    });
    const [INDICATOR_DOTS] = useFixtureSelect('Indicator Dots', {
        options: ['true', 'false'],
        defaultValue: 'true',
    });
    const [ARROW_BUTTONS] = useFixtureSelect('Arrow Buttons', {
        options: ['true', 'false'],
        defaultValue: 'true',
    });
    const [AUTHOR_IMAGE] = useFixtureSelect('Author Image', {
        options: ['true', 'false'],
        defaultValue: 'true',
    });
    const [AUTHOR_TITLE] = useFixtureSelect('Author Title', {
        options: ['true', 'false'],
        defaultValue: 'true',
    });
    const [LINK_TYPE] = useFixtureSelect('Link Type', {
        options: ['none', 'button', 'anchor'],
        defaultValue: 'none',
    });

    const updatedBlock = {
        ...mockTestimonials,
        carouselOverflow: CAROUSEL_OVERFLOW === 'true',
        cardColor: CARD_COLOR,
        indicatorDots: INDICATOR_DOTS === 'true',
        arrowButtons: ARROW_BUTTONS === 'true',
        authorImage: AUTHOR_IMAGE === 'true',
        authorTitle: AUTHOR_TITLE === 'true',
        linkType: LINK_TYPE,
    };

    const blockConfig = blocksRegistry.findBlock(
        'blocks',
        'testimonials-block',
    );

    if (!blockConfig) {
        return <div>Block not found</div>;
    }

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
                    carouselOverflow: CAROUSEL_OVERFLOW === 'true',
                    cardColor: CARD_COLOR,
                    indicatorDots: INDICATOR_DOTS === 'true',
                    arrowButtons: ARROW_BUTTONS === 'true',
                    authorImage: AUTHOR_IMAGE === 'true',
                    authorTitle: AUTHOR_TITLE === 'true',
                    linkType: LINK_TYPE,
                }}
            />
        </div>
    );
};

export default Fixture;
