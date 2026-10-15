import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import { getTranslations } from 'next-intl/server';
import { getPayloadClient } from '../../payload/client';
import { BuildProcessSteps } from '@/utils/shared';
import { ScrollRedirectFooter } from '../../animation/components/scroll-redirect-footer';
import { asDoc } from '../../payload/utils/as-doc';

defineBlockComponent({
    slug: 'build-process-footer',
    component: async ({ page }) => {
        if (!isAllowedPageTaxonomy(page, ['buildProcess'])) return;

        const [payload, t] = await Promise.all([
            getPayloadClient(),
            getTranslations(),
        ]);

        const taxonomyData = page.taxonomyData?.buildProcess;

        if (!taxonomyData?.step) return null;

        const targetStepIndex = BuildProcessSteps[taxonomyData.step] + 1;

        if (!BuildProcessSteps[targetStepIndex]) return null;

        const result = await payload.find({
            collection: 'pages',
            limit: 1,
            where: {
                taxonomyType: { equals: 'buildProcess' },
                _status: { equals: 'published' },
                'taxonomyData.buildProcess.step': {
                    equals: BuildProcessSteps[targetStepIndex],
                },
            },
            select: {
                path: true,
                permalink: true,
                taxonomyData: {
                    buildProcess: {
                        cover: true,
                        step: true,
                    },
                },
            },
        });

        const targetPage = asDoc(result.docs[0]);

        if (!targetPage || !targetPage.permalink) return null;

        return (
            <ScrollRedirectFooter
                data-hide-footer
                eyebrow={t('common.chapter', {
                    value: targetStepIndex,
                })}
                title={t(`BuildProcess.${BuildProcessSteps[targetStepIndex]}`)}
                cover={targetPage.taxonomyData?.buildProcess?.cover}
                permalink={targetPage.permalink}
                fadeEyebrow={false}
            />
        );
    },
});
