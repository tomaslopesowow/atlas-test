import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { YachtHeader } from '@/components/common/yacht-header';
import { Vessel } from '@/features/payload/features/yatco/utils/yatco-client';
import { Either, Option, Schema } from 'effect';
import { getVesselDisplayLength } from '../../payload/features/yatco/utils/get-display-length';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatMoneyWithoutDecimals } from '@/utils/format-money-no-decimals';
import * as Sentry from '@sentry/nextjs';

defineBlockComponent({
    slug: 'resale-vessel-header',
    component: async ({ page }) => {
        const [locale, t] = await Promise.all([
            getLocale(),
            getTranslations('YachtDetail'),
        ]);

        const vessel = Schema.decodeUnknownEither(Vessel)(
            page.taxonomyData?.resale?.yatcoData,
        );

        if (Either.isLeft(vessel)) {
            // If the vessel data is not valid, but we have data, log an error
            if (page.taxonomyData?.resale?.yatcoData) {
                Sentry.captureException(
                    new Error('Error decoding yatco vessel data'),
                    {
                        extra: {
                            page: page.title,
                            pageId: page.id,
                            error: vessel.left.message,
                        },
                    },
                );
            }

            return null;
        }

        const hull =
            page.taxonomyData?.resale?.hullId ?? vessel.right.HullDeck?.HullID;

        const length = getVesselDisplayLength(
            vessel.right.Dimension?.Length,
            vessel.right.Dimension?.LengthUnitType,
            locale,
        ).pipe(Option.getOrNull);

        return (
            <YachtHeader
                title={page.title}
                about={page.taxonomyData?.resale?.about}
                cover={{
                    type: 'image',
                    image: page.taxonomyData?.resale?.cover,
                }}
                hull={hull}
                length={length}
                year={vessel.right.Info?.YearBuilt}
                statistics={[
                    [
                        t('price'),
                        formatMoneyWithoutDecimals(
                            vessel.right.Listing?.AskingPrice,
                            locale,
                        ).pipe(Option.getOrNull),
                    ],
                    [t('length'), length],
                    [t('hull'), hull],
                    [
                        t('stateRooms', {
                            count: vessel.right.Accomodation?.StateRooms ?? 0,
                        }),
                        vessel.right.Accomodation?.StateRooms ?? '-',
                    ],
                ]}
            />
        );
    },
});
