import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import {
    BrokerDetails,
    Vessel,
} from '@/features/payload/features/yatco/utils/yatco-client';
import { Either, Option, pipe, Schema } from 'effect';
import { getLocale, getTranslations } from 'next-intl/server';
import * as Sentry from '@sentry/nextjs';
import Heading from '@/components/common/heading';
import { LexicalRenderer } from '@/components/content/lexical-node';

const _LOG_PREFIX = '[resale-vessel-footer]';

defineBlockComponent({
    slug: 'resale-vessel-footer',
    component: async ({ page, block }) => {
        const [_locale, _t] = await Promise.all([
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

        // Show feadship broker if available, else just show the first available broker
        const brokerDetails = Schema.decodeUnknownOption(BrokerDetails)(
            page.taxonomyData?.resale?.yatcoBroker,
        );

        const vesselBroker = pipe(
            brokerDetails,
            Option.flatMap((brokerDetails) =>
                Option.fromNullable(
                    vessel.right.Brokers?.find(
                        (broker) => broker.BrokerID === brokerDetails.BrokerID,
                    ),
                ),
            ),
        );

        const broker = Option.zipWith(
            brokerDetails,
            vesselBroker,
            (brokerDetails, vesselBroker) => ({
                ...vesselBroker,
                ...brokerDetails,
            }),
        );

        if (Option.isNone(broker)) {
            return null;
        }

        const brokerImageUrl =
            broker.value.PhotoURL ?? broker.value.CompanyLogoURL;

        const brokerRepresentativeName = Option.zipWith(
            Option.fromNullable(broker.value.FirstName),
            Option.fromNullable(broker.value.LastName),
            (firstName, lastName) => `${firstName} ${lastName}`,
        );

        return (
            <div className="grid grid-cols-12 text-center">
                <div className="col-span-12 md:col-span-8 md:col-start-3 lg:col-span-6 lg:col-start-4 flex flex-col gap-y-10 md:gap-y-20 items-center">
                    <div className="flex flex-col gap-y-10 max-w-2xl">
                        <Heading variant="heading-4" as="h2">
                            {block.title}
                        </Heading>
                        <div className="text-sm text-primary/70">
                            <LexicalRenderer content={block.text} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-y-10 items-center">
                        {brokerImageUrl && (
                            <img
                                src={brokerImageUrl}
                                alt={brokerRepresentativeName.pipe(
                                    Option.map(
                                        (name) =>
                                            `${page.title} broker: ${name}`,
                                    ),
                                    Option.getOrElse(
                                        () => `${page.title} broker`,
                                    ),
                                )}
                                sizes="9rem"
                                width={144}
                                height={144}
                                className="rounded-full overflow-hidden object-cover size-24 md:size-36"
                            />
                        )}

                        <div className="flex flex-col gap-2">
                            <p className="text-headline font-sans font-medium">
                                {Option.getOrNull(brokerRepresentativeName)}
                            </p>
                            <p>{broker.value.OfficeName}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    },
});
