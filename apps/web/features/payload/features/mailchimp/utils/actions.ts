'use server';

import type { ErrorResponse } from '@mailchimp/mailchimp_marketing';
import { getPayloadClient } from '@/features/payload/client';
import { getMailchimpClient } from './mailchimp-client';

const createErrorResponse = (message: string): ErrorResponse => {
    return {
        type: 'unknown',
        title: 'Unknown error',
        status: 400,
        detail: message,
        instance: '',
    } as ErrorResponse;
};

export const fetchMergeFields = async (mailchimpListId: string) => {
    const payload = await getPayloadClient();

    const mailchimpClient = await getMailchimpClient(payload);

    if (!mailchimpClient) {
        return createErrorResponse('Mailchimp client is not available');
    }
    const mergeFields = await mailchimpClient.lists
        .getListMergeFields(mailchimpListId)
        .catch((error) => {
            return createErrorResponse(error.message);
        })
        .then((response) => {
            if (!('merge_fields' in response)) {
                return createErrorResponse('Merge fields are not available');
            }
            return response.merge_fields;
        });

    return mergeFields;
};
