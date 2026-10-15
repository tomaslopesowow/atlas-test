'use server';

import { getPayloadClient } from '@/features/payload/client';
import { getYatcoClient, Vessel } from './yatco-client';
import { Schema } from 'effect';

export type YatcoSyncTaskDispatchResult = {
    success: boolean;
    jobId?: string;
};

export type RefreshResalePageDataResult = {
    success: boolean;
    message: string;
};

export async function refreshResalePageData(
    pageId: string,
): Promise<RefreshResalePageDataResult> {
    const payload = await getPayloadClient();

    // Get the page to find yatcoVesselId
    const page = await payload.findByID({ collection: 'pages', id: pageId });
    const yatcoVesselId = page?.taxonomyData?.resale?.yatcoVesselId;

    if (!yatcoVesselId) {
        return { success: false, message: 'No Yatco vessel ID found' };
    }

    // Fetch fresh data from Yatco API
    const yatcoClient = await getYatcoClient(payload);
    const vessel = await yatcoClient?.ForSale.Vessel.byID({
        vesselId: String(yatcoVesselId),
    });

    if (!vessel) {
        return { success: false, message: 'Vessel not found in Yatco' };
    }

    // Update the page with fresh data
    await payload.update({
        collection: 'pages',
        id: pageId,
        context: { skipYatcoRefreshHook: true },
        data: {
            taxonomyData: {
                resale: {
                    yatcoData: Schema.encodeSync(Vessel)(vessel),
                    yatcoDataFetchedAt: new Date().toISOString(),
                },
            },
        },
    });

    return { success: true, message: 'Yatco data refreshed' };
}

export async function yatcoSyncTaskDispatch(
    _initialState: Record<never, never>,
    _formData: FormData,
): Promise<YatcoSyncTaskDispatchResult> {
    const payload = await getPayloadClient();

    let job = await payload
        .find({
            collection: 'payload-jobs',
            limit: 1,
            where: {
                and: [
                    {
                        taskSlug: {
                            equals: 'syncYatcoResale',
                        },
                    },
                ],
            },
        })
        .then(({ docs }) => docs.at(0));

    // queue the job if it doesn't exist
    job ??= await payload.jobs.queue({
        task: 'syncYatcoResale',
        input: {},
    });

    // immediately run the job
    await payload.jobs.runByID({ id: job.id });

    return { success: true, jobId: job.id };
}
