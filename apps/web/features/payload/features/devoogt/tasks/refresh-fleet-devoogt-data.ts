import type { TaskConfig } from 'payload';
import { getDVDBClient } from '../utils/devoogtdb-client';
import * as Sentry from '@sentry/nextjs';

const LOG_PREFIX = '[fleet/refreshDeVoogtData]';

export const refreshFleetDeVoogtDataTask: TaskConfig<'refreshFleetDeVoogtData'> =
    {
        slug: 'refreshFleetDeVoogtData',
        retries: 2,

        inputSchema: [
            { name: 'pageId', type: 'text', required: true },
            { name: 'dvdbReferenceId', type: 'text', required: true },
        ],

        onFail: ({ job, input }) => {
            Sentry.captureException(
                new Error('Refresh fleet De Voogt data task failed'),
                {
                    extra: { job, input },
                },
            );
        },

        async handler({ req, input }) {
            const { payload } = req;
            const { pageId, dvdbReferenceId } = input;

            payload.logger.info(
                `${LOG_PREFIX} Starting refresh for page ${pageId} (dvdbReferenceId: ${dvdbReferenceId})`,
            );

            const dvdbClient = await getDVDBClient(payload);
            const yacht = await dvdbClient.FleetData.DeVoogtID({
                deVoogtID: String(dvdbReferenceId),
            });

            if (!yacht) {
                payload.logger.warn(
                    `${LOG_PREFIX} Skipping: yacht not found in DVDB (dvdbReferenceId: ${dvdbReferenceId})`,
                );
                return {
                    output: { success: false, reason: 'yacht_not_found' },
                };
            }

            await payload.update({
                req,
                collection: 'pages',
                id: pageId,
                context: { skipDeVoogtRefreshHook: true }, // Prevent infinite loop
                data: {
                    taxonomyData: {
                        fleet: {
                            deVoogtData: yacht,
                            deVoogtDataFetchedAt: new Date().toISOString(),
                        },
                    },
                },
            });

            payload.logger.info(
                `${LOG_PREFIX} Refreshed page ${pageId} (yacht: ${yacht.launch_name || yacht.hull})`,
            );
            return { output: { success: true, pageId } };
        },
    };
