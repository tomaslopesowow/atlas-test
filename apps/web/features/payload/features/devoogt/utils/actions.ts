'use server';

import { getPayloadClient } from '@/features/payload/client';
import { getDVDBClient } from './devoogtdb-client';
import { Effect } from 'effect';
import * as Sentry from '@sentry/nextjs';

export type FleetSyncTaskDispatchResult = {
    success: boolean;
    jobId?: string;
};

export type RefreshFleetPageDataResult = {
    success: boolean;
    message: string;
};

export async function refreshFleetPageData(
    pageId: string,
): Promise<RefreshFleetPageDataResult> {
    const payload = await getPayloadClient();

    // Get the page to find dvdbReferenceId
    const page = await payload.findByID({ collection: 'pages', id: pageId });
    const dvdbId = page?.taxonomyData?.fleet?.dvdbReferenceId;

    if (!dvdbId) {
        return { success: false, message: 'No DVDB reference ID found' };
    }

    // Fetch fresh data from DVDB API
    const dvdbClient = await getDVDBClient(payload);
    const yacht = await dvdbClient?.FleetData.DeVoogtID({
        deVoogtID: String(dvdbId),
    });

    if (!yacht) {
        return { success: false, message: 'Yacht not found in DVDB' };
    }

    // Update the page with fresh data
    await payload.update({
        collection: 'pages',
        id: pageId,
        context: { skipDeVoogtRefreshHook: true },
        data: {
            taxonomyData: {
                fleet: {
                    deVoogtData: yacht,
                    deVoogtDataFetchedAt: new Date().toISOString(),
                },
            },
        },
    });

    return { success: true, message: 'De Voogt data refreshed' };
}

export async function fleetSyncTaskDispatch(
    _initialState: Record<never, never>,
    _formData: FormData,
): Promise<FleetSyncTaskDispatchResult> {
    return Effect.tryPromise({
        try: async () => {
            const payload = await getPayloadClient();

            let job = await payload
                .find({
                    collection: 'payload-jobs',
                    limit: 1,
                    where: {
                        and: [
                            {
                                taskSlug: {
                                    equals: 'syncFleet',
                                },
                            },
                        ],
                    },
                })
                .then(({ docs }) => docs.at(0));

            // queue the job if it doesn't exist
            job ??= await payload.jobs.queue({
                task: 'syncFleet',
                input: {},
            });

            // immediately run the job
            await payload.jobs.runByID({ id: job.id });

            return { success: true, jobId: job.id };
        },
        catch: (error) => error,
    }).pipe(
        Effect.catchAll((error) => {
            Sentry.captureException(error, {
                extra: {
                    context: 'fleetSyncTaskDispatch',
                },
            });
            const message =
                error instanceof Error ? error.message : String(error);
            return Effect.succeed({ success: false, message });
        }),
        Effect.runPromise,
    );
}
