'use client';
import '@/components/blocks/faq-block';
import { blocksRegistry } from '@/features/blocks/registry';
import type { Page } from '@/payload-types';
import { useFixtureSelect } from 'react-cosmos/client';

export const mockFaqBlock = {
    id: 'fixture-faq-block',
    blockType: 'faq-block' as const,
    sectionTitle: 'FAQS',
    title: 'These are the most frequently asked questions',
    text: 'We have answered them for you',
    faqs: [
        {
            id: 'faq-1',
            question: 'What is the best way to learn React?',
            answer: 'The best way to learn React is to build projects.',
        },
        {
            id: 'faq-2',
            question: 'How do I get started with TypeScript?',
            answer: 'Start with the official documentation and practice with small projects.',
        },
        {
            id: 'faq-3',
            question: 'What are the benefits of using Next.js?',
            answer: 'Next.js provides server-side rendering, routing, and optimization out of the box.',
        },
    ],
};

export const Fixture = () => {
    const [openMultipleQuestions] = useFixtureSelect(
        'Open Multiple Questions',
        {
            options: ['true', 'false'],
            defaultValue: 'false',
        },
    );

    const [collapsible] = useFixtureSelect('Collapsible', {
        options: ['true', 'false'],
        defaultValue: 'true',
    });

    const [titlesCentered] = useFixtureSelect('Titles Centered', {
        options: ['true', 'false'],
        defaultValue: 'false',
    });

    const [border] = useFixtureSelect('Border', {
        options: ['true', 'false'],
        defaultValue: 'true',
    });

    const [layoutHorizontal] = useFixtureSelect('Layout Horizontal', {
        options: ['true', 'false'],
        defaultValue: 'false',
    });

    const [gapVertical] = useFixtureSelect('Gap Vertical', {
        options: [
            'gap-y-4',
            'gap-y-6',
            'gap-y-8',
            'gap-y-12',
            'gap-y-8 md:gap-y-12',
        ],
        defaultValue: 'gap-y-8 md:gap-y-12',
    });

    const [gapHorizontal] = useFixtureSelect('Gap Horizontal', {
        options: [
            'gap-x-2',
            'gap-x-4',
            'gap-x-6',
            'gap-x-8',
            'gap-x-4 md:gap-x-8',
        ],
        defaultValue: 'gap-x-4 md:gap-x-8',
    });

    const [iconType] = useFixtureSelect('Icon Type', {
        options: ['plus', 'chevron'],
        defaultValue: 'plus',
    });

    const [iconAnimationDuration] = useFixtureSelect(
        'Icon Animation Duration',
        {
            options: ['100', '200', '300', '400', '500'],
            defaultValue: '200',
        },
    );

    const updatedBlock = {
        ...mockFaqBlock,
        openMultipleQuestions: openMultipleQuestions === 'true',
        collapsible: collapsible === 'true',
        titlesCentered: titlesCentered === 'true',
        border: border === 'true',
        layoutHorizontal: layoutHorizontal === 'true',
        gapVertical,
        gapHorizontal,
        iconType,
        iconAnimationDuration: Number.parseInt(iconAnimationDuration, 10),
    };

    const blockConfig = blocksRegistry.findBlock('blocks', 'faq-block');

    if (!blockConfig) {
        return <div>FAQ block not found in registry</div>;
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
                    openMultipleQuestions: openMultipleQuestions === 'true',
                    collapsible: collapsible === 'true',
                    titlesCentered: titlesCentered === 'true',
                    border: border === 'true',
                    layoutHorizontal: layoutHorizontal === 'true',
                    gapVertical,
                    gapHorizontal,
                    iconType,
                    iconAnimationDuration: Number.parseInt(
                        iconAnimationDuration,
                        10,
                    ),
                }}
            />
        </div>
    );
};

export default Fixture;
