import { getCollectionsWithAuthSchema } from '@/features/payload/utils/get-collections-with-auth';
import { jwtSign } from '@/features/payload/utils/jwt-sign';
import { NextResponse } from 'next/server';
import type { Endpoint } from 'payload';
import { object, string } from 'zod';
import { SCHEMA_OTP_CODE } from '../config/schemas';
import type { UserWithOTPFields } from '../config/types';
import { incrementLoginAttempts } from '../utils/increment-login-attempts';

/**
 * Endpoint for handling OTP-based user login
 *
 * This endpoint validates a one-time password code submitted by a user and performs the login flow:
 * 1. Validates the request body containing email, code and collection
 * 2. Finds the user and corresponding OTP entry
 * 3. Verifies the OTP code is valid and not expired
 * 4. Removes the used OTP code
 * 5. Generates a JWT token for the authenticated session
 * 6. Sets the token in an HTTP-only cookie
 */
export const loginOtp: Endpoint = {
    path: '/otp/login',
    method: 'post',
    handler: async (req) => {
        // Define schema to validate request body
        const bodySchema = object({
            code: SCHEMA_OTP_CODE,
            collection: getCollectionsWithAuthSchema(req.payload),
            email: string().email(),
        });

        const formData = await req.formData?.();
        const data = JSON.parse(
            (formData?.get('_payload') ?? 'null') as string,
        );

        const parsedData = bodySchema.safeParse(data);

        if (!parsedData.success) {
            return NextResponse.json(
                {
                    message: req.t('error:unspecific'),
                    errors: parsedData.error.format(),
                },
                { status: 400 },
            );
        }

        const collection = req.payload.collections[parsedData.data.collection];
        const { email, code } = parsedData.data;
        const { maxLoginAttempts } = collection.config.custom.otpPlugin;

        await incrementLoginAttempts({
            collection: parsedData.data.collection,
            payload: req.payload,
            email,
        });

        /** Find user and otp by email */
        let user = await req.payload
            .find({
                collection: parsedData.data.collection,
                limit: 1,
                depth: 0,
                where: {
                    email: { equals: email },
                },
            })
            .then((res) => res.docs[0] as UserWithOTPFields);

        if ((user.loginAttempts?.count ?? 0) > maxLoginAttempts) {
            return NextResponse.json(
                { message: req.t('error:userLocked') },
                { status: 401 },
            );
        }

        if (!user || !code || !user?.otp?.code || user.otp.code !== code) {
            return NextResponse.json(
                { message: req.t('error:verificationTokenInvalid') },
                { status: 401 },
            );
        }

        /** Remove OTP doc after successful validation */
        user = (await req.payload.update({
            collection: parsedData.data.collection,
            id: user.id,
            data: {
                otp: {
                    code: null,
                    expiresAt: null,
                },
            } as any,
        })) as UserWithOTPFields;

        /** Generate JWT token for authenticated session */
        const { token, exp } = await jwtSign({
            fieldsToSign: {
                id: user.id,
                email: user.email,
                collection: collection.config.slug,
            },
            secret: req.payload.secret,
            tokenExpiration: collection.config.auth.tokenExpiration,
        });

        const response = NextResponse.json({ user, token, exp });

        // Set JWT token in HTTP-only cookie
        response.cookies.set(
            `${req.payload.config.cookiePrefix}-token`,
            token,
            {
                httpOnly: true,
                secure: true,
                path: '/',
                expires: exp * 1000,
            },
        );

        return response;
    },
};
