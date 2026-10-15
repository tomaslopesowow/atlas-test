'use server';

import type { ErrorResponse } from '@mailchimp/mailchimp_marketing';
import { captureException } from '@sentry/nextjs';
import { Effect, pipe, Schema } from 'effect';
import { getMailchimpClient } from '@/features/payload/features/mailchimp/utils/mailchimp-client';
import { getPayloadClient } from '../../payload/client';

const SCHEMA_MAILCHIMP_ADD_LIST_MEMBER = Schema.Struct({
    email_address: Schema.String,
    mailchimpListId: Schema.String,
});

export type MailchimpAddListMemberResult =
    | { error: string }
    | { success: boolean };

/**
 * Attempts to add a new subscriber to a Mailchimp list using the provided form data.
 *
 * Handles the following:
 * - Validates the input data via schema decoding (email and list ID)
 * - Fetches both Payload and Mailchimp clients
 * - Attempts the Mailchimp operation and gracefully handles errors, returning a consistent result structure
 *
 * @param _initialState - Unused previous action state (managed by useActionState)
 * @param formData - FormData containing at least email_address and mailchimpListId
 * @returns An object indicating either success or an error message
 */
export async function mailchimpAddListMember(
    _initialState: MailchimpAddListMemberResult,
    formData: FormData,
): Promise<MailchimpAddListMemberResult> {
    const payload = await getPayloadClient();
    const mailchimpClient = await getMailchimpClient(payload);

    // Log that an attempt to add a member is being made
    payload.logger.info('Mailchimp add list member...');

    // Fail early if the Mailchimp client could not be instantiated
    if (!mailchimpClient) {
        return {
            error: 'Mailchimp client not available',
        };
    }

    // Pipeline to decode, call Mailchimp API, and normalize the result
    const result = await pipe(
        // Decode and validate form data
        Schema.decodeUnknownOption(SCHEMA_MAILCHIMP_ADD_LIST_MEMBER)(
            Object.fromEntries(formData.entries()),
        ),
        // If valid, attempt to add member to the list
        Effect.flatMap(({ mailchimpListId, email_address }) =>
            Effect.promise(() =>
                mailchimpClient.lists
                    .addListMember(mailchimpListId, {
                        email_address,
                        status: 'subscribed', // Set to 'subscribed' immediately
                    })
                    .catch((error) => {
                        // Capture and log errors with Sentry and Payload logger
                        captureException(error);
                        payload.logger.error('Mailchimp add list member error');
                        payload.logger.error(error);
                        // Return error object shaped for downstream handling
                        return { error: String(error ?? 'Unknown error') };
                    }),
            ),
        ),
        // Normalize Mailchimp API response into our result union
        Effect.andThen((result) => {
            // If the result contains an 'id', Mailchimp considers it a success
            if ('id' in result) {
                return { success: true };
            }
            // Otherwise, extract Mailchimp's error message detail or provide a fallback
            captureException(new Error('Mailchimp add list member error'), {
                extra: { result },
            });
            return {
                error: (result as ErrorResponse)?.detail ?? 'Unknown error',
            };
        }),
        // Catch and wrap any unexpected pipeline errors into a known err result
        Effect.catchAll((error) => {
            captureException(error);
            return Effect.succeed({ error: String(error ?? 'Unknown error') });
        }),
        // Execute the pipeline and await the result
        Effect.runPromise,
    );

    payload.logger.info('Mailchimp add list member result');
    payload.logger.info(result);

    return result;
}
