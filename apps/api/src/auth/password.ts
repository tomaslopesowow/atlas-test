import {
    randomBytes,
    type ScryptOptions,
    scrypt,
    timingSafeEqual,
} from 'node:crypto';

const KEY_LENGTH = 64;

// 32 MiB of memory a hash: costly for whoever guesses offline, still a few tens of ms for a login
const COST = { N: 2 ** 15, r: 8, p: 1 };

const derive = (password: string, salt: Buffer, options: ScryptOptions) =>
    new Promise<Buffer>((resolve, reject) =>
        scrypt(
            password,
            salt,
            KEY_LENGTH,
            // the default ceiling is exactly 32 MiB, which this cost reaches
            { ...options, maxmem: 64 * 1024 * 1024 },
            (error, key) => (error ? reject(error) : resolve(key)),
        ),
    );

export interface PasswordInput {
    password: string;
}

export interface VerifyPasswordInput extends PasswordInput {
    hash: string;
}

/** `scrypt$N$r$p$salt$key`, so the cost can be raised later without breaking the hashes stored before. */
export const hashPassword = async ({
    password,
}: PasswordInput): Promise<string> => {
    const salt = randomBytes(16);
    const key = await derive(password, salt, COST);

    return [
        'scrypt',
        COST.N,
        COST.r,
        COST.p,
        salt.toString('base64'),
        key.toString('base64'),
    ].join('$');
};

/** Whether the password matches the hash, compared in constant time; false for a hash it cannot read. */
export const verifyPassword = async ({
    password,
    hash,
}: VerifyPasswordInput): Promise<boolean> => {
    const [scheme, N, r, p, salt, key] = hash.split('$');

    if (scheme !== 'scrypt' || !salt || !key) return false;

    const expected = Buffer.from(key, 'base64');
    const actual = await derive(password, Buffer.from(salt, 'base64'), {
        N: Number(N),
        r: Number(r),
        p: Number(p),
    });

    return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
    );
};
