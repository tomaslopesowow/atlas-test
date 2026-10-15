import type { TaskConfig } from 'payload';
import { getYatcoClient, Vessel } from '../utils/yatco-client';
import * as Sentry from '@sentry/nextjs';
import { Schema } from 'effect';
import { findBrokerByVesselId } from '../utils/find-broker-by-vessel-id';

const LOG_PREFIX = '[resale/refreshYatcoData]';

export const refreshResaleYatcoDataTask: TaskConfig<'refreshResaleYatcoData'> =
    {
        slug: 'refreshResaleYatcoData',
        retries: 2,

        inputSchema: [
            { name: 'pageId', type: 'text', required: true },
            { name: 'yatcoVesselId', type: 'text', required: true },
        ],

        onFail: ({ job, input }) => {
            Sentry.captureException(
                new Error('Refresh resale Yatco data task failed'),
                {
                    extra: { job, input },
                },
            );
        },

        async handler({ req, input }) {
            const { payload } = req;
            const { pageId, yatcoVesselId } = input;

            payload.logger.info(
                `${LOG_PREFIX} Starting refresh for page ${pageId} (yatcoVesselId: ${yatcoVesselId})`,
            );

            const yatcoClient = await getYatcoClient(payload);
            const vessel = await yatcoClient?.ForSale.Vessel.byID({
                vesselId: String(yatcoVesselId),
            });

            if (!vessel) {
                payload.logger.warn(
                    `${LOG_PREFIX} Skipping: vessel not found in Yatco (yatcoVesselId: ${yatcoVesselId})`,
                );
                return {
                    output: { success: false, reason: 'vessel_not_found' },
                };
            }

            const yatcoBroker = await findBrokerByVesselId(
                vessel.Info?.VesselID,
                yatcoClient,
            );

            await payload.update({
                req,
                collection: 'pages',
                id: pageId,
                context: { skipYatcoRefreshHook: true }, // Prevent infinite loop
                data: {
                    taxonomyData: {
                        resale: {
                            yatcoData: Schema.encodeSync(Vessel)(vessel),
                            yatcoDataFetchedAt: new Date().toISOString(),
                            yatcoBroker,
                        },
                    },
                },
            });

            payload.logger.info(
                `${LOG_PREFIX} Refreshed page ${pageId} (vessel: ${vessel.Description?.VesselName || yatcoVesselId})`,
            );
            return { output: { success: true, pageId } };
        },
    };
