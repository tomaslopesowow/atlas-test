import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { Yacht as DVDBYacht } from '../../payload/features/devoogt/utils/devoogtdb-client';
import { Vessel as YatcoVessel } from '../../payload/features/yatco/utils/yatco-client';
import { YachtSpecificationsClient } from './yacht-specifications.client';
import { getLocale, getTranslations } from 'next-intl/server';
import {
    FLEET_DEFAULT_SPECIFICATIONS,
    type YachtSpecificationLine,
} from './yacht-specification.shared';
import { Option, pipe, Schema } from 'effect';
import { getPayloadClient } from '../../payload/client';
import { getSettings } from '../../payload/local-api/get-settings';
import { asDoc } from '../../payload/utils/as-doc';
import type { ReactNode } from 'react';

const LOG_PREFIX = '[yacht-specifications]';

defineBlockComponent({
    slug: 'yacht-specifications',
    component: async ({
        block,
        page: { taxonomyData, taxonomyType },
        routeAlias,
    }) => {
        const [payload, t, locale] = await Promise.all([
            getPayloadClient(),
            getTranslations('YachtSpecifications'),
            getLocale(),
        ]);

        const refitPage = await getSettings().then((settings) =>
            asDoc(settings?.pages?.refit),
        );

        const isRefitPage =
            !!refitPage &&
            !!routeAlias?.source.id &&
            refitPage.id === routeAlias.source.id;

        payload.logger.info(`${LOG_PREFIX} isRefitPage: ${isRefitPage}`);

        let yachtData: Option.Option<DVDBYacht | YatcoVessel> = Option.none();

        switch (taxonomyType) {
            case 'fleet': {
                yachtData = Schema.decodeUnknownOption(DVDBYacht)(
                    taxonomyData?.fleet?.deVoogtData,
                );
                break;
            }
            case 'resale': {
                yachtData = Schema.decodeUnknownOption(YatcoVessel)(
                    taxonomyData?.resale?.yatcoData,
                );
                break;
            }
        }

        if (Option.isNone(yachtData)) return null;

        const defaultSpecifications =
            FLEET_DEFAULT_SPECIFICATIONS.map<YachtSpecificationLine | null>(
                (descriptor) => {
                    let value: ReactNode = '';

                    const _LOG_PREFIX = '[yacht-specifications]';

                    switch (taxonomyType) {
                        case 'fleet': {
                            value = pipe(
                                yachtData,
                                Option.flatMap((data) =>
                                    descriptor.deVoogtDB(
                                        data as DVDBYacht,
                                        locale,
                                        t,
                                    ),
                                ),
                                Option.getOrElse(() => ''),
                            );
                            break;
                        }
                        case 'resale': {
                            value = pipe(
                                yachtData,
                                Option.flatMap((data) =>
                                    descriptor.yatco(
                                        data as YatcoVessel,
                                        locale,
                                        t,
                                    ),
                                ),
                                Option.getOrElse(() => ''),
                            );
                            break;
                        }
                    }

                    return {
                        category: descriptor.category,
                        label: Option.getOrElse(descriptor.label(t), () => ''),
                        value,
                    };
                },
            ).filter((x): x is NonNullable<typeof x> => Boolean(x));

        const refitSpecifications: YachtSpecificationLine[] =
            isRefitPage && 'refit_scopes' in yachtData.value
                ? yachtData.value.refit_scopes.map<YachtSpecificationLine>(
                      (scope) => ({
                          category: 'refit',
                          label: String(scope?.year ?? ''),
                          value: String(scope?.scope ?? ''),
                      }),
                  )
                : [];

        payload.logger.info(
            `${LOG_PREFIX} refitSpecifications: ${JSON.stringify(refitSpecifications)}`,
        );
        const mergedSpecifications = new Map<string, YachtSpecificationLine>(
            [
                ...refitSpecifications,
                ...defaultSpecifications,
                ...(block.customSpecifications ?? []),
            ].map((line) => [line.label, line]),
        );

        const uniquePopulatedCategories = new Set(
            Iterator.from(mergedSpecifications.values())
                .filter((line) => !!line.value)
                .map((line) => line.category)
                .toArray(),
        );

        payload.logger.info(
            `${LOG_PREFIX} uniquePopulatedCategories: ${JSON.stringify(Array.from(uniquePopulatedCategories))}`,
        );

        return (
            <YachtSpecificationsClient
                block={block}
                categories={Array.from(uniquePopulatedCategories)}
                specifications={Array.from(mergedSpecifications.values())}
            />
        );
    },
});
