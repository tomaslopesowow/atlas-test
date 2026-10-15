import { SignJWT } from 'jose';

/**
 * Signs a JWT token with the provided fields and secret
 * @param params - The parameters for signing the JWT
 * @param params.fieldsToSign - Key-value pairs to include in the JWT payload
 * @param params.secret - Secret key used to sign the JWT
 * @param params.tokenExpiration - Token expiration time in seconds
 * @returns Object containing expiration timestamp and signed JWT token
 *
 * @see https://github.com/payloadcms/payload/blob/2118c6c47f5c59161318964cc100c61e1ba986b9/packages/payload/src/auth/jwt.ts#L4
 */
export const jwtSign = async ({
    fieldsToSign,
    secret,
    tokenExpiration,
}: {
    fieldsToSign: Record<string, unknown>;
    secret: string;
    tokenExpiration: number;
}) => {
    const secretKey = new TextEncoder().encode(secret);
    const issuedAt = Math.floor(Date.now() / 1000);
    const exp = issuedAt + tokenExpiration;

    const token = await new SignJWT(fieldsToSign)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt(issuedAt)
        .setExpirationTime(exp)
        .sign(secretKey);

    return { exp, token };
};
