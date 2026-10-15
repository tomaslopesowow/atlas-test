import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { Endpoint } from 'payload';
import { string } from 'zod';

/**
 * Endpoint for verifying a JWT token
 */
export const verify: Endpoint = {
    path: '/auth/verify',
    method: 'post',
    handler: async (req) => {
        // Define schema to validate request body
        const token = string().min(1).safeParse(req.searchParams.get('token'));

        if (!token?.success) {
            return NextResponse.json(
                {
                    message: 'Unauthorized',
                },
                { status: 401 },
            );
        }

        try {
            // Verify the JWT token
            const { payload } = await jwtVerify(
                token.data,
                new TextEncoder().encode(req.payload.secret),
            );

            return NextResponse.json(
                {
                    message: 'Token verified successfully',
                    payload,
                },
                { status: 200 },
            );
        } catch (_error) {
            return NextResponse.json(
                {
                    message: 'Unauthorized',
                },
                { status: 401 },
            );
        }
    },
};
