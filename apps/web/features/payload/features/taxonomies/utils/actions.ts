'use server';

import { getPayloadClient } from '@/features/payload/client';

export type ArticleSeedTaskDispatchResult = {
    success: boolean;
    jobId?: string;
};

export async function articleSeedTaskDispatch(
    _initialState: Record<never, never>,
    _formData: FormData,
): Promise<ArticleSeedTaskDispatchResult> {
    const payload = await getPayloadClient();

    let job = await payload
        .find({
            collection: 'payload-jobs',
            limit: 1,
            where: {
                and: [
                    {
                        taskSlug: {
                            equals: 'seedAllArticlesFromCraftCMS',
                        },
                    },
                ],
            },
        })
        .then(({ docs }) => docs.at(0));

    // queue the job if it doesn't exist
    job ??= await payload.jobs.queue({
        task: 'seedAllArticlesFromCraftCMS',
        input: {},
    });

    // immediately run the job
    await payload.jobs.runByID({ id: job.id });

    return { success: true, jobId: job.id };
}

export type PressEntrySeedTaskDispatchResult = {
    success: boolean;
    jobId?: string;
};

export async function pressEntrySeedTaskDispatch(
    _initialState: Record<never, never>,
    _formData: FormData,
): Promise<PressEntrySeedTaskDispatchResult> {
    const payload = await getPayloadClient();

    let job = await payload
        .find({
            collection: 'payload-jobs',
            limit: 1,
            where: {
                and: [
                    {
                        taskSlug: {
                            equals: 'seedAllPressEntriesFromCraftCMS',
                        },
                    },
                ],
            },
        })
        .then(({ docs }) => docs.at(0));

    // queue the job if it doesn't exist
    job ??= await payload.jobs.queue({
        task: 'seedAllPressEntriesFromCraftCMS',
        input: {},
    });

    // immediately run the job
    await payload.jobs.runByID({ id: job.id });

    return { success: true, jobId: job.id };
}
