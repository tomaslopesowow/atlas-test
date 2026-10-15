'use client';

import { useTranslations } from 'next-intl';
import Heading from '@/components/common/heading';
import { AnimatedHeading } from '../../animation/components/animated-heading';
import type { PathLabels } from '@/types/shared';
import type { Yacht } from '../../payload/features/devoogt/utils/devoogtdb-client';
import { useMemo } from 'react';
import { LexicalRenderer } from '@/components/content/lexical-node';
import type { Page } from '@/payload-types';
import { CirclesHeader } from '@/components/common/circles-header';
import type { MediaField } from '@/payload-types';
import type { Maybe } from '@/utils/maybe';

type FleetYachtHeaderClientProps = {
    page: Page;
    yachtData: Yacht;
    isTransition: boolean;
};

type Statistics = {
    label: string;
    value: keyof Yacht;
};

const STATISTICS: Statistics[] = [
    { label: 'Hull', value: 'hull' },
    { label: 'Length', value: 'readable_length' },
    { label: 'Year', value: 'year' },
];

/**
 * @deprecated Use `YachtHeader` instead
 */
export const FleetYachtHeaderClient = ({
    page,
    yachtData,
    isTransition,
}: FleetYachtHeaderClientProps) => {
    const t = useTranslations('common');

    const pathLabels = useMemo<PathLabels>(
        () => [
            `[Y${yachtData.year}]`,
            `[H${yachtData.hull}]`,
            `[L${yachtData.readable_length}]`,
        ],
        [yachtData],
    );

    if (!page.title) return null;

    const subtitle = t('scrollToExplore');
    const introductionEyebrow = `${t('thisIs')} ${page.title}`;
    const coverMedia: Maybe<MediaField> = page.taxonomyData?.fleet?.cover
        ? {
              type: 'image',
              image: page.taxonomyData?.fleet?.cover,
          }
        : null;

    return (
        <>
            <CirclesHeader
                eyebrow={String(yachtData.year)}
                title={page.title}
                labels={pathLabels}
                isTransition={isTransition}
                subtitle={subtitle}
                media={coverMedia}
            />
            <div className="flex flex-col pt-20 sm:pt-40 gap-y-20 sm:gap-y-40">
                <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x justify-center divide-primary bg-primary z-10">
                    {STATISTICS.map((statistic) => (
                        <div
                            key={statistic.value}
                            className="flex flex-col items-center justify-center gap-y-3 w-full sm:w-1/3 lg:w-1/5 py-4 sm:py-0"
                        >
                            <h3 className="sr-only">{`${statistic.label}: ${yachtData[statistic.value]}`}</h3>
                            <Heading variant="base" className="text-xs" as="p">
                                {statistic.label}
                            </Heading>
                            <p>{yachtData[statistic.value] as string}</p>
                        </div>
                    ))}
                </div>
                {page.taxonomyData?.fleet?.about && (
                    <div className="flex flex-col items-center text-center sm:gap-y-16 gap-x-8">
                        <Heading
                            variant="base"
                            className="text-center p-4 sm:p-0 max-w-2xl"
                            as="p"
                        >
                            {introductionEyebrow}
                        </Heading>
                        <AnimatedHeading
                            config={{
                                fillOnScroll: { enabled: true },
                                fadeIn: { scrub: 3 },
                            }}
                            as="div"
                            variant="heading-5"
                            className="text-center max-w-5xl p-4 sm:p-0"
                        >
                            <LexicalRenderer
                                content={page.taxonomyData?.fleet?.about}
                            />
                        </AnimatedHeading>
                    </div>
                )}
            </div>
        </>
    );
};
