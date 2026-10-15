// Broker - prefer Feadship, fall back to first broker

import { Effect, Option, pipe } from 'effect';
import { YATCO_FEADSHIP_BROKER_ID } from '../shared';
import type { YatcoClient } from './yatco-client';
import type { Maybe } from '@/utils/maybe';

/**
 * Find broker details by Yatco vessel ID
 * @param vesselId Yatco vessel ID
 * @param yatcoClient Yatco client
 * @returns Broker details
 */
export const findBrokerByVesselId = (
    vesselId: Maybe<number>,
    yatcoClient: YatcoClient,
) =>
    pipe(
        Option.fromNullable(vesselId),
        Effect.flatMap((vesselId) =>
            Effect.tryPromise(() =>
                yatcoClient?.ForSale.VesselBrokers.byVesselID({
                    vesselID: String(vesselId),
                }),
            ),
        ),
        Effect.andThen(Option.fromNullable),
        Effect.flatMap((brokers) =>
            Option.fromNullable(
                brokers.find(
                    (broker) => broker.BrokerID === YATCO_FEADSHIP_BROKER_ID,
                ) ?? brokers.at(0),
            ),
        ),
        Effect.catchAll(() => Effect.succeed(null)),
        Effect.runPromise,
    );
