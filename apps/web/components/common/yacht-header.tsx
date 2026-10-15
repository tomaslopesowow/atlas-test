'use client';

import { useTranslations } from 'next-intl';
import Heading from '@/components/common/heading';
import { type ReactNode, useMemo } from 'react';
import { LexicalRenderer } from '@/components/content/lexical-node';
import { CirclesHeader } from '@/components/common/circles-header';
import type { MediaField } from '@/payload-types';
import type { Maybe } from '@/utils/maybe';
import type { TypedEditorState } from '@payloadcms/richtext-lexical';
import { AnimatedHeading } from '@/features/animation/components/animated-heading';

type YachtHeaderProps = {
    title?: Maybe<string>;
    cover?: Maybe<MediaField>;
    hull?: Maybe<string | number>;
    year?: Maybe<string | number>;
    length?: Maybe<string>;
    isTransition?: Maybe<boolean>;
    about?: Maybe<TypedEditorState>;
    statistics?: Maybe<Array<[label: string, value: Maybe<string | number>]>>;
};

export const YachtHeader = ({
    about,
    cover,
    hull,
    isTransition,
    length,
    statistics,
    title,
    year,
}: YachtHeaderProps) => {
    const t = useTranslations('YachtDetail');

    const pathLabels = useMemo<[ReactNode, ReactNode, ReactNode]>(() => {
        const labels: ReactNode[] = [];
        if (year != null) labels.push(`Y${year}`);
        if (hull != null) labels.push(`H${hull}`);
        if (length != null) labels.push(`L${length}`);
        return labels as [ReactNode, ReactNode, ReactNode];
    }, [hull, year, length]);

    if (!title) return null;

    const subtitle = t('scrollToExplore');
    const introductionEyebrow = t('thisIs', { title });

    return (
        <>
            <CirclesHeader
                eyebrow={year?.toString()}
                title={title}
                labels={pathLabels}
                isTransition={isTransition}
                subtitle={subtitle}
                media={cover}
            />

            <div className="flex flex-col pt-20 sm:pt-40 gap-y-20 sm:gap-y-40">
                <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x justify-center divide-primary bg-primary z-10">
                    {statistics?.map(
                        ([label, value], index) =>
                            value != null && (
                                <div
                                    key={`${label}-${
                                        // biome-ignore lint/suspicious/noArrayIndexKey: combined with label
                                        index
                                    }`}
                                    className="flex flex-col items-center justify-center gap-y-3 w-full sm:w-1/3 lg:w-1/5 py-4 sm:py-0"
                                >
                                    <h3 className="sr-only">{`${label}: ${value}`}</h3>
                                    <Heading
                                        variant="base"
                                        className="text-xs"
                                        as="p"
                                    >
                                        {label}
                                    </Heading>
                                    <p>{value}</p>
                                </div>
                            ),
                    )}
                </div>

                {about && (
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
                            <LexicalRenderer content={about} />
                        </AnimatedHeading>
                    </div>
                )}
            </div>
        </>
    );
};
