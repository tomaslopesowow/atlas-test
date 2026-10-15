import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import { getTranslations } from 'next-intl/server';
import { getPayloadClient } from '../../payload/client';
import { BuildProcessSteps } from '@/utils/shared';
import type { StepsNavigationStep } from '@/types/shared';
import { ClippedMedia } from '../../animation/components/clipped-media';
import { AnimatedHeading } from '../../animation/components/animated-heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { StepNavigation } from '@/components/common/step-navigation';

defineBlockComponent({
    slug: 'build-process-header',
    component: async ({ page, pageProps }) => {
        if (!isAllowedPageTaxonomy(page, ['buildProcess'])) return;

        const [payload, t, searchParams] = await Promise.all([
            getPayloadClient(),
            getTranslations(),
            pageProps.searchParams,
        ]);

        const taxonomyData = page.taxonomyData?.buildProcess;

        if (!taxonomyData?.step) return null;

        const eyebrow = t('common.chapter', {
            value: BuildProcessSteps[taxonomyData.step],
        });

        const title = t(`BuildProcess.${taxonomyData.step}`);

        const { docs } = await payload.find({
            collection: 'pages',
            where: {
                and: [
                    {
                        taxonomyType: {
                            equals: 'buildProcess',
                        },
                    },
                    {
                        _status: {
                            equals: 'published',
                        },
                    },
                ],
            },
            select: {
                path: true,
                permalink: true,
                taxonomyData: {
                    buildProcess: {
                        step: true,
                    },
                },
            },
        });

        const currentStep = {
            index: BuildProcessSteps[taxonomyData.step],
        };

        const steps = docs.reduce((acc: StepsNavigationStep[], doc) => {
            if (!doc.taxonomyData?.buildProcess?.step) return acc;

            const index =
                BuildProcessSteps[doc.taxonomyData?.buildProcess?.step];
            const permalink = doc.permalink;

            if (!index || !permalink) return acc;
            acc.push({ index, permalink });
            return acc;
        }, []);

        const isTransition = searchParams.tr === '1';

        return (
            <>
                <StepNavigation
                    title={title}
                    currentStep={currentStep}
                    steps={steps}
                />
                <div className="h-[75svh] flex flex-col items-center justify-center gap-y-16 px-2">
                    <div className="flex flex-col gap-y-16 text-center max-w-5xl uppercase">
                        {eyebrow && (
                            <AnimatedHeading
                                variant="base"
                                config={
                                    isTransition
                                        ? { fadeIn: { enabled: false } }
                                        : undefined
                                }
                            >
                                {eyebrow}
                            </AnimatedHeading>
                        )}

                        {title && (
                            <AnimatedHeading
                                variant="heading-1"
                                config={
                                    isTransition
                                        ? { fadeIn: { enabled: false } }
                                        : undefined
                                }
                            >
                                {title}
                            </AnimatedHeading>
                        )}
                    </div>
                </div>
                <ClippedMedia
                    media={{ type: 'image', image: taxonomyData.cover }}
                />
                <div className="w-full flex justify-center py-40">
                    <AnimatedHeading
                        config={{
                            fillOnScroll: { enabled: true },
                            fadeIn: { scrub: 3 },
                        }}
                        variant={'heading-4'}
                        className="text-center max-w-5xl p-4 sm:p-0"
                    >
                        {renderLexicalSimple(taxonomyData.introduction)}
                    </AnimatedHeading>
                </div>
            </>
        );
    },
});
