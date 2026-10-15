import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    eventually,
    type Harness,
    PASSWORD,
    startHarness,
} from './harness.js';

let h: Harness;

before(async () => {
    h = await startHarness();
});

after(() => h.close());

const register = (json: object) => h.post('/auth/register', { json });
const login = (email: string, password = PASSWORD) =>
    h.post('/auth/login', { json: { email, password } });

describe('POST /auth/register', () => {
    it('creates the account and signs it in', async () => {
        const { status, body } = await register({
            email: 'Ada@Example.test',
            password: PASSWORD,
            name: '  Ada  ',
        });

        assert.equal(status, 201);
        assert.match(body.token, /^[\w-]{43}$/);
        assert.deepEqual(Object.keys(body.user).sort(), [
            'avatar',
            'createdAt',
            'email',
            'id',
            'name',
            'permissions',
        ]);
        assert.deepEqual(body.user.permissions, []);
        assert.equal(body.user.email, 'ada@example.test');
        assert.equal(body.user.name, 'Ada');
        assert.equal(body.user.avatar, null);

        const days = (Date.parse(body.expiresAt) - Date.now()) / 86_400_000;
        assert.ok(days > 29.9 && days <= 30, `expires in ${days} days`);

        assert.equal((await h.get('/me', { as: body })).body.id, body.user.id);
    });

    it('stores the password hashed with scrypt, never as written', async () => {
        const [{ passwordHash }] = await h.query(
            `SELECT "passwordHash" FROM "user" WHERE email = 'ada@example.test'`,
        );

        assert.match(passwordHash, /^scrypt\$32768\$8\$1\$/);
        assert.ok(!passwordHash.includes(PASSWORD));
    });

    it('welcomes the user by mail, escaping their name in the html', async () => {
        await register({
            email: 'eve@example.test',
            password: PASSWORD,
            name: '<b>Eve</b>',
        });

        const mail = await eventually(() =>
            h.mails.find(({ to }) => to === 'eve@example.test'),
        );

        assert.equal(mail.subject, 'Welcome to Atlas');
        assert.match(mail.raw, /&lt;b&gt;Eve&lt;\/b&gt;/);
    });

    it('refuses an email that is taken, whatever its case', async () => {
        const { status } = await register({
            email: 'ADA@example.TEST',
            password: PASSWORD,
            name: 'Another Ada',
        });

        assert.equal(status, 409);
    });

    for (const [why, json] of [
        ['no email', { password: PASSWORD, name: 'x' }],
        ['an invalid email', { email: 'nope', password: PASSWORD, name: 'x' }],
        [
            'a password under 8 characters',
            { email: 'a@x.test', password: '1234567', name: 'x' },
        ],
        [
            'a password over 128 characters',
            { email: 'a@x.test', password: 'x'.repeat(129), name: 'x' },
        ],
        ['no name', { email: 'a@x.test', password: PASSWORD }],
        [
            'a name of only spaces',
            { email: 'a@x.test', password: PASSWORD, name: '   ' },
        ],
        [
            'a name over 50 characters',
            { email: 'a@x.test', password: PASSWORD, name: 'x'.repeat(51) },
        ],
    ] as const)
        it(`refuses ${why} with a 400`, async () => {
            assert.equal((await register(json)).status, 400);
        });
});

describe('POST /auth/login', () => {
    it('signs in with the right password, whatever the email case, in a session of its own', async () => {
        const first = await login('ada@example.test');
        const second = await login(' ADA@example.test ');

        assert.equal(first.status, 200);
        assert.equal(first.body.user.email, 'ada@example.test');
        assert.notEqual(first.body.token, second.body.token);
    });

    it('refuses a wrong password and an unknown email alike', async () => {
        const wrongPassword = await login(
            'ada@example.test',
            'not the password',
        );
        const unknownEmail = await login('nobody@example.test');

        assert.equal(wrongPassword.status, 401);
        assert.equal(unknownEmail.status, 401);
        assert.equal(wrongPassword.body.message, unknownEmail.body.message);
    });

    it('refuses an empty body with a 400', async () => {
        assert.equal((await h.post('/auth/login', { json: {} })).status, 400);
    });
});

describe('sessions', () => {
    it('protects every route but register and login', async () => {
        for (const [method, path] of [
            ['GET', '/me'],
            ['GET', '/posts'],
            ['POST', '/posts'],
            ['GET', '/users/1'],
            ['GET', '/me/notifications'],
            ['POST', '/auth/logout'],
        ] as const)
            assert.equal(
                (await h.request(method, path)).status,
                401,
                `${method} ${path}`,
            );
    });

    it('refuses a token that is malformed, unknown, or not sent as a Bearer', async () => {
        const { body } = await login('ada@example.test');

        for (const authorization of [
            'Bearer',
            `Token ${body.token}`,
            `bearer${body.token}`,
            `Bearer ${body.token}x`,
            `Bearer ${'a'.repeat(43)}`,
            `Bearer ${body.token} ${body.token}`,
        ])
            assert.equal(
                (await h.get('/me', { headers: { authorization } })).status,
                401,
                authorization,
            );
    });

    it('signs out only the session it is called with', async () => {
        const phone = (await login('ada@example.test')).body;
        const laptop = (await login('ada@example.test')).body;

        assert.equal((await h.post('/auth/logout', { as: phone })).status, 204);
        assert.equal((await h.get('/me', { as: phone })).status, 401);
        assert.equal((await h.get('/me', { as: laptop })).status, 200);
    });

    it('refuses an expired session', async () => {
        const session = (await login('ada@example.test')).body;

        await h.query(
            `UPDATE "session" SET "expiresAt" = now() - interval '1 second' WHERE "expiresAt" = $1`,
            [session.expiresAt],
        );

        assert.equal((await h.get('/me', { as: session })).status, 401);
    });

    it('stores only a hash of each token', async () => {
        const session = (await login('ada@example.test')).body;
        const rows = await h.query(`SELECT "tokenHash" FROM "session"`);

        assert.ok(rows.length > 0);
        assert.ok(
            rows.every(({ tokenHash }) => /^[0-9a-f]{64}$/.test(tokenHash)),
        );
        assert.ok(!rows.some(({ tokenHash }) => tokenHash === session.token));
    });
});

describe('the admin account', () => {
    it('exists from boot, so registering its email is refused', async () => {
        assert.equal(
            (
                await register({
                    email: ADMIN_EMAIL,
                    password: PASSWORD,
                    name: 'Not the admin',
                })
            ).status,
            409,
        );
    });

    it('signs in with ADMIN_PASSWORD, and is the only admin', async () => {
        const admin = await h.signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
        const user = await h.signUp('plain@example.test');

        assert.equal((await h.get('/roles', { as: admin })).status, 200);
        assert.equal((await h.get('/roles', { as: user })).status, 403);
    });
});
