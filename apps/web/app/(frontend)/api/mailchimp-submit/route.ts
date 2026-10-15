import { NextResponse } from 'next/server';
import z from 'zod';
import { getPayloadClient } from '@/features/payload/client';
import { getMailchimpClient } from '@/features/payload/features/mailchimp/utils/mailchimp-client';
import * as Sentry from '@sentry/nextjs';
import { MAILCHIMP_EMAIL_FIELD } from '@/utils/shared';

const REQUEST_SCHEMA = z.object({
    requiredFields: z.array(z.string()).min(1),
    data: z.record(z.string()),
    mailchimpListId: z.string().min(1, 'Mailchimp list ID is required'),
});

const createDataSchema = (requiredFields: string[]) =>
    z.object(
        Object.fromEntries(
            requiredFields.map((field) => [
                field,
                field === MAILCHIMP_EMAIL_FIELD.key
                    ? z.string().trim().email()
                    : z.string().trim().min(1),
            ]),
        ),
    );

export async function POST(request: Request) {
    const body = await request.json();

    const requestParsed = REQUEST_SCHEMA.safeParse(body);
    if (!requestParsed.success) {
        return NextResponse.json(
            {
                success: false,
                error: 'Invalid request format',
                errorKey: 'invalidRequest',
            },
            { status: 400 },
        );
    }

    const { requiredFields, data, mailchimpListId } = requestParsed.data;

    const dataSchema = createDataSchema(requiredFields);
    const dataParsed = dataSchema.safeParse(data);

    if (!dataParsed.success) {
        return NextResponse.json(
            {
                success: false,
                error: 'Validation failed',
                errorKey: 'validationFailed',
                details: {
                    fieldErrors: dataParsed.error.flatten().fieldErrors,
                },
            },
            { status: 400 },
        );
    }

    const payload = await getPayloadClient();
    const mailchimpClient = await getMailchimpClient(payload);

    if (!mailchimpClient) {
        return NextResponse.json(
            {
                success: false,
                error: 'Mailchimp client not available',
                errorKey: 'serverError',
            },
            { status: 500 },
        );
    }

    const { [MAILCHIMP_EMAIL_FIELD.key]: email, ...mergeFields } =
        dataParsed.data;

    try {
        await mailchimpClient.lists.addListMember(mailchimpListId, {
            email_address: email,
            status: 'subscribed',
            merge_fields: mergeFields,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const mailchimpError = error as { detail?: string };
        payload.logger.error(
            `Failed to subscribe to Mailchimp: ${mailchimpError}`,
        );
        Sentry.captureException(new Error('Failed to subscribe to Mailchimp'), {
            extra: { mailchimpError },
        });

        return NextResponse.json(
            {
                success: false,
                error: mailchimpError?.detail || 'Failed to subscribe',
                errorKey: 'unknownError',
            },
            { status: 400 },
        );
    }
}
