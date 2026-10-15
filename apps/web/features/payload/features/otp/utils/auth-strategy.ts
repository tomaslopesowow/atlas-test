import { SCHEMA_MONGO_ID } from '@/features/payload/config/schemas';
import { getCollectionsWithAuthSchema } from '@/features/payload/utils/get-collections-with-auth';
import { decodeJwt } from 'jose';
import type { AuthStrategy } from 'payload';
import { object, string } from 'zod';
import type { UserWithOTPFields } from '../config/types';

/**
 * Default response when no valid user is found or authentication fails
 */
const NO_USER_RESPONSE = Object.freeze({ user: null });

/**
 * Authentication strategy for One-Time Password (OTP) based authentication
 * This strategy validates JWT tokens stored in cookies to authenticate users
 *
 * The strategy performs the following steps:
 * 1. Extracts the JWT token from cookies
 * 2. Validates the token expiration
 * 3. Validates the token payload (user ID, collection, email)
 * 4. Verifies the user exists and matches the token data
 *
 * @implements {AuthStrategy}
 */
export const OTPAuthStrategy: AuthStrategy = {
    /** Strategy name used to identify this authentication method */
    name: 'cookie',

    /**
     * Authenticates a request by validating the JWT token in cookies
     *
     * @param params - Authentication parameters
     * @param params.payload - Payload CMS instance
     * @param params.headers - Request headers
     * @returns Authentication result with user data or null
     */
    async authenticate({ payload, headers }) {
        // Extract JWT token from cookies using configured prefix
        const token =
            headers
                .get('cookie')
                ?.match(
                    new RegExp(
                        `${payload.config.cookiePrefix}-token=([^;]*);*`,
                    ),
                )?.[1] ?? null;

        // Return early if no token found
        if (!token) return NO_USER_RESPONSE;

        // Decode JWT token and validate expiration
        const decoded = decodeJwt(token);
        const expiresAt = new Date((decoded.exp ?? 0) * 1000);
        if (expiresAt < new Date()) return NO_USER_RESPONSE;

        // Define schema to validate decoded JWT data
        const decodedDataSchema = object({
            collection: getCollectionsWithAuthSchema(payload),
            email: string().email(),
            id: SCHEMA_MONGO_ID,
        });

        // Parse and validate the decoded token data
        const parsedData = decodedDataSchema.safeParse(decoded);

        // Return early if validation fails
        if (!parsedData.success) return NO_USER_RESPONSE;

        // Fetch user from database using token data
        const user = (await payload
            .findByID({
                collection: parsedData.data.collection,
                id: parsedData.data.id,
            })
            .catch(() => null)) as UserWithOTPFields;

        // Verify user email matches token
        if (!user || user.email !== parsedData.data.email)
            return NO_USER_RESPONSE;

        // Return authenticated user with collection info
        return {
            user: { ...user, collection: parsedData.data.collection },
        };
    },
};
