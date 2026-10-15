import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { beforeEach, describe, it, mock } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AppConfig } from '../config/app.config.js';
import type { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { hashPassword } from './password.js';
import type { SessionEntity } from './session.entity.js';

const me = {
    id: 5,
    email: 'ada@example.test',
    name: 'Ada',
    avatar: null,
    createdAt: new Date(),
};
const sha256 = (token: string) =>
    createHash('sha256').update(token).digest('hex');

const sessions = {
    insert: mock.fn(async (_row: Partial<SessionEntity>) => ({})),
    delete: mock.fn(async (_criteria: unknown) => ({ affected: 0 })),
    findOne: mock.fn(
        async (
            _options: unknown,
        ): Promise<Pick<SessionEntity, 'userId'> | null> => ({ userId: 5 }),
    ),
};

const passwordHash = await hashPassword({ password: 'correct horse' });

const usersService = {
    create: mock.fn(async (_input: unknown) => me),
    findCredentials: mock.fn(
        async (
            _input: unknown,
        ): Promise<{ id: number; passwordHash: string } | null> => ({
            id: 5,
            passwordHash,
        }),
    ),
    findMe: mock.fn(async (_input: unknown) => me),
};

let service: AuthService;

beforeEach(() => {
    for (const fn of [
        ...Object.values(sessions),
        ...Object.values(usersService),
    ]) {
        fn.mock.resetCalls();
        fn.mock.restore();
    }

    service = new AuthService(
        sessions as unknown as Repository<SessionEntity>,
        usersService as unknown as UsersService,
        { sessionTtlDays: 30 } as AppConfig,
    );
});

describe('AuthService.register', () => {
    it('hands the users service a hash, never the password, and signs the new user in', async () => {
        const { token, user } = await service.register({
            email: 'ada@example.test',
            password: 'correct horse',
            name: 'Ada',
        });

        const [input] = usersService.create.mock.calls[0]?.arguments as [
            Record<string, string>,
        ];

        assert.equal('password' in input, false);
        assert.match(input.passwordHash ?? '', /^scrypt\$/);
        assert.equal(user, me);
        assert.equal(
            sessions.insert.mock.calls[0]?.arguments[0].tokenHash,
            sha256(token),
        );
    });
});

describe('AuthService.login', () => {
    it("starts a session of 30 days, storing only the token's hash", async () => {
        const { token, expiresAt } = await service.login({
            email: 'ada@example.test',
            password: 'correct horse',
        });
        const [row] = sessions.insert.mock.calls[0]?.arguments ?? [];

        assert.match(token, /^[\w-]{43}$/);
        assert.equal(row?.tokenHash, sha256(token));
        assert.equal(row?.userId, 5);
        assert.ok(
            Math.abs(expiresAt.getTime() - (Date.now() + 30 * 86_400_000)) <
                5_000,
        );
    });

    it("clears the user's expired sessions as it starts one", async () => {
        await service.login({
            email: 'ada@example.test',
            password: 'correct horse',
        });

        const [criteria] = sessions.delete.mock.calls[0]?.arguments as [
            { userId: number },
        ];

        assert.equal(criteria.userId, 5);
    });

    it('refuses a wrong password', async () => {
        await assert.rejects(
            service.login({ email: 'ada@example.test', password: 'wrong' }),
            new UnauthorizedException('Wrong email or password'),
        );
        assert.equal(sessions.insert.mock.callCount(), 0);
    });

    it('refuses an unknown email the same way, after hashing just as long', async () => {
        usersService.findCredentials.mock.mockImplementation(async () => null);

        const started = performance.now();
        await assert.rejects(
            service.login({
                email: 'nobody@example.test',
                password: 'correct horse',
            }),
            new UnauthorizedException('Wrong email or password'),
        );

        assert.ok(performance.now() - started > 5, 'answered without hashing');
        assert.equal(sessions.insert.mock.callCount(), 0);
    });
});

describe('AuthService.authenticate', () => {
    it("finds the unexpired session by the token's hash", async () => {
        const token = 'a'.repeat(43);

        assert.equal(await service.authenticate({ token }), 5);

        const [{ where }] = sessions.findOne.mock.calls[0]?.arguments as [
            { where: { tokenHash: string } },
        ];
        assert.equal(where.tokenHash, sha256(token));
    });

    it('signs no one in for a missing or expired session', async () => {
        sessions.findOne.mock.mockImplementation(async () => null);

        assert.equal(
            await service.authenticate({ token: 'a'.repeat(43) }),
            undefined,
        );
    });

    it('refuses a token that is not one, without querying', async () => {
        for (const token of ['', 'short', 'a'.repeat(44), `${'a'.repeat(42)}!`])
            assert.equal(
                await service.authenticate({ token }),
                undefined,
                token,
            );

        assert.equal(sessions.findOne.mock.callCount(), 0);
    });
});

describe('AuthService.logout', () => {
    it("deletes the session by the token's hash", async () => {
        await service.logout({ token: 'a'.repeat(43) });

        assert.deepEqual(sessions.delete.mock.calls[0]?.arguments, [
            { tokenHash: sha256('a'.repeat(43)) },
        ]);
    });
});
