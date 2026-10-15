import { OtpEmail, otpEmailSubject } from '@repo/email/emails/otp';
import { renderHtmlAndText } from '@repo/email/utils/render';
import { customAlphabet } from 'nanoid';
import { NextResponse } from 'next/server';
import type { Endpoint } from 'payload';
import { object, string } from 'zod';
import { getCollectionsWithAuthSchema } from '@/features/payload/utils/get-collections-with-auth';
import type { UserWithOTPFields } from '../config/types';

/** Number of minutes before an OTP code expires */
const OTP_EXPIRY_MINUTES = 10;

/** Length of generated OTP codes */
const OTP_LENGTH = 6;

/** Function to generate numeric OTP codes of specified length */
const genCode = customAlphabet('0123456789', OTP_LENGTH);

/**
 * Endpoint to generate a one-time password (OTP) for user authentication
 *
 * The endpoint performs the following steps:
 * 1. Validates the request body containing email and collection
 * 2. Verifies the user exists in the specified collection
 * 3. Generates and stores a new OTP code
 * 4. Returns success response with user email
 */
export const generateOtp: Endpoint = {
    path: '/otp/generate',
    method: 'post',
    handler: async (req) => {
        // Define schema for request body validation
        const bodySchema = object({
            email: string().email(),
            collection: getCollectionsWithAuthSchema(req.payload),
        });

        // Parse form data from request
        const formData = await req.formData?.();
        const data = JSON.parse(
            (formData?.get('_payload') ?? 'null') as string,
        );

        const parsedData = bodySchema.safeParse(data);

        // Return error if request body validation fails
        if (!parsedData.success) {
            return NextResponse.json(
                {
                    message: req.t('error:unspecific'),
                    errors: parsedData.error.format(),
                },
                { status: 400 },
            );
        }

        // Find user by email in specified collection
        let user = await req.payload
            .find({
                collection: parsedData.data.collection,
                limit: 1,
                depth: 0,
                where: { email: { equals: parsedData.data.email } },
            })
            .then((res) => res.docs[0] as UserWithOTPFields);

        // Return error if user not found
        if (!user) {
            return NextResponse.json(
                { message: req.t('authentication:emailNotValid') },
                { status: 401 },
            );
        }

        const code = genCode();

        // Generate and store new OTP code
        user = (await req.payload.update({
            collection: parsedData.data.collection,
            id: user.id,
            data: {
                otp: {
                    code,
                    expiresAt: new Date(
                        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
                    ).toISOString(),
                },
            } as any,
        })) as UserWithOTPFields;

        const locale = req.locale ?? 'en';
        const emailData = await renderHtmlAndText(
            OtpEmail({ code, expiryMinutes: OTP_EXPIRY_MINUTES, locale }),
        );

        req.payload.sendEmail({
            to: user.email,
            subject: otpEmailSubject(code, locale),
            ...emailData,
        });

        // Return success response with user email
        return NextResponse.json(
            { success: true, email: user.email },
            { status: 200 },
        );
    },
};
