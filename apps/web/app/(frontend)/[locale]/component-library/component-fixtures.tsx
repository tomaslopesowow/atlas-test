import type { AnyPageProps } from '@/features/pages/shared';
import type { Content, Page, TestimonialsBlock } from '@/payload-types';

export const CONTENT_BLOCK_FIXTURE: Content & {
    textAlignment?: 'top' | 'center' | 'bottom';
    textCentered?: boolean;
    gapHorizontal?: string;
    mediaAspectRatio?: string;
    mediaBorderRadius?: string;
} = {
    blockType: 'content',
    title: 'A Better Workflow',
    subtitle: 'Deploy Faster',
    text: {
        root: {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    version: 1,
                    children: [
                        {
                            type: 'text',
                            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                            version: 1,
                        },
                    ],
                },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
        },
    },
    mediaPosition: 'left',
    media: {
        type: 'image',
        image: {
            objectFit: 'cover',
            media: {
                id: 'test-media-id',
                url: 'https://owowagency-main.ams3.cdn.digitaloceanspaces.com/Frame%202075804354-928x1208.webp',
                width: 800,
                height: 600,
                description: 'Sample image for testing',
                filename: 'test-image.webp',
                mimeType: 'image/webp',
                filesize: 100000,
                updatedAt: '2024-01-01T00:00:00.000Z',
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    },
    buttons: [
        {
            id: 'button-1',
            link: {
                type: 'external',
                url: 'https://www.google.com',
                title: 'Primary',
            },
        },
        {
            id: 'button-2',
            link: {
                type: 'external',
                url: 'https://www.google.com',
                title: 'Secondary',
            },
        },
    ],
    // Layout settings
    textAlignment: 'top',
    textCentered: false,
    gapHorizontal: 'gap-x-12',
    mediaAspectRatio: 'aspect-[4/3] md:aspect-[3/4]',
    mediaBorderRadius: 'rounded-lg',
};

export const TESTIMONIALS_BLOCK_FIXTURE: TestimonialsBlock & {
    carouselOverflow?: boolean;
    cardColor?: string;
    indicatorDots?: boolean;
    arrowButtons?: boolean;
    authorImage?: boolean;
    authorTitle?: boolean;
    linkType?: 'none' | 'button' | 'anchor';
} = {
    blockType: 'testimonials-block',
    title: 'Testimonials',
    subtitle: 'What our clients say',
    testimonials: Array.from({ length: 12 }, (_, index) => ({
        id: `testimonial-${index + 1}`,
        content:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        updatedAt: '2024-01-01T00:00:00.000Z',
        link: {
            type: 'external',
            url: 'https://www.owow.io',
            title: 'View insights',
        },
        logo: {
            media: {
                id: `test-logo-id-${index + 1}`,
                url: 'https://cdn.prod.website-files.com/6365d860c7b7a7191055eb8a/66eeb030dcea757c29ff2b9b_45%2520Degrees.svg',
                width: 30,
                height: 30,
                description: 'Sample logo for testing',
                filename: 'test-logo.webp',
                mimeType: 'image/webp',
                updatedAt: '2024-01-01T00:00:00.000Z',
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        author: {
            id: `author-${index + 1}`,
            name: `OWOW WizKid ${index + 1}`,
            updatedAt: '2024-01-01T00:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z',
            function: 'Developer',
            image: {
                objectFit: 'cover',
                media: {
                    id: `test-media-id-${index + 1}`,
                    url: 'https://owowagency-main.ams3.cdn.digitaloceanspaces.com/Frame%202075804354-928x1208.webp',
                    width: 800,
                    height: 600,
                    description: 'Sample image for testing',
                    filename: 'test-image.webp',
                    mimeType: 'image/webp',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                    createdAt: '2024-01-01T00:00:00.000Z',
                },
            },
        },
    })),
    // Testimonial block configuration options
    carouselOverflow: true,
    cardColor: 'bg-surface-secondary',
    indicatorDots: true,
    arrowButtons: true,
    authorImage: true,
    authorTitle: true,
    linkType: 'none',
};

export const MOCK_PAGE_PROPS: AnyPageProps = {
    params: Promise.resolve({ locale: 'en', rest: [] }),
    searchParams: Promise.resolve({}),
};

export const MOCK_PAGE: Page = {
    id: 'test-page',
    title: 'Test Page',
    blocks: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
};
