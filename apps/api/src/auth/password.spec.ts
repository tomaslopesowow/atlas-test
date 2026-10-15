import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, verifyPassword } from './password.js';

describe('hashPassword', () => {
    it('writes the scheme, the cost, a salt and the key', async () => {
        const hash = await hashPassword({ password: 'correct horse' });
        const [scheme, N, r, p, salt, key] = hash.split('$');

        assert.deepEqual([scheme, N, r, p], ['scrypt', '32768', '8', '1']);
        assert.equal(Buffer.from(salt ?? '', 'base64').length, 16);
        assert.equal(Buffer.from(key ?? '', 'base64').length, 64);
    });

    it('salts every hash, so the same password never hashes the same twice', async () => {
        assert.notEqual(
            await hashPassword({ password: 'correct horse' }),
            await hashPassword({ password: 'correct horse' }),
        );
    });
});

describe('verifyPassword', () => {
    it('accepts the password the hash was made from', async () => {
        const hash = await hashPassword({ password: 'correct horse' });

        assert.equal(
            await verifyPassword({ password: 'correct horse', hash }),
            true,
        );
    });

    it('refuses any other, a case off included', async () => {
        const hash = await hashPassword({ password: 'correct horse' });

        for (const password of [
            'Correct horse',
            'correct horse ',
            '',
            'correct',
        ])
            assert.equal(
                await verifyPassword({ password, hash }),
                false,
                password,
            );
    });

    it('reads the cost from the hash, so hashes made at another cost still verify', async () => {
        const hash = await hashPassword({ password: 'correct horse' });
        const [, , , , salt] = hash.split('$');
        const { scryptSync } = await import('node:crypto');
        const cheaper = scryptSync(
            'correct horse',
            Buffer.from(salt ?? '', 'base64'),
            64,
            { N: 1024, r: 8, p: 1 },
        );

        assert.equal(
            await verifyPassword({
                password: 'correct horse',
                hash: `scrypt$1024$8$1$${salt}$${cheaper.toString('base64')}`,
            }),
            true,
        );
    });

    it('refuses a hash it cannot read, rather than throwing', async () => {
        for (const hash of [
            '',
            'plaintext',
            'bcrypt$10$abc',
            'scrypt$32768$8$1$$',
        ])
            assert.equal(
                await verifyPassword({ password: 'x', hash }),
                false,
                hash,
            );
    });

    it('refuses a key of the wrong length, which timingSafeEqual would throw on', async () => {
        const hash = await hashPassword({ password: 'correct horse' });
        const truncated = hash.slice(0, -10);

        assert.equal(
            await verifyPassword({
                password: 'correct horse',
                hash: truncated,
            }),
            false,
        );
    });
});
