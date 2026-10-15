import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
    type Account,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    fileForm,
    type Harness,
    PNG,
    startHarness,
} from './harness.js';

let h: Harness;
let admin: Account;
let ada: Account;

before(async () => {
    h = await startHarness();
    admin = await h.signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    ada = await h.signUp('ada@example.test', 'Ada');
});

after(() => h.close());

describe('admin panel api', () => {
    it('is for admins only', async () => {
        assert.equal((await h.get('/admin/api/schema')).status, 401);
        assert.equal(
            (await h.get('/admin/api/schema', { as: ada })).status,
            403,
        );
        assert.equal(
            (await h.get('/admin/api/schema', { as: admin })).status,
            200,
        );
    });

    it('creates a user who can sign in, keeping no password anywhere', async () => {
        const { status, body } = await h.post('/admin/api/resources/user', {
            as: admin,
            json: {
                email: 'Grace@Example.TEST',
                name: 'Grace',
                passwordHash: 'grace password',
            },
        });

        assert.equal(status, 201);
        assert.equal(body.data.values.email, 'grace@example.test');
        assert.equal(body.data.values.passwordHash, undefined);
        await h.signIn('grace@example.test', 'grace password');
    });

    it('never changes a password on an update', async () => {
        const { status } = await h.patch(
            `/admin/api/resources/user/${ada.id}`,
            {
                as: admin,
                json: { name: 'Ada L', passwordHash: 'another password' },
            },
        );

        assert.equal(status, 200);
        await h.signIn(ada.email);
    });
});

describe('admin panel roles', () => {
    it("sets and clears a user's one role from the update form", async () => {
        const grace = await h.signUp('grace.role@example.test', 'Grace');
        const save = (role: string | null) =>
            h.patch(`/admin/api/resources/user/${grace.id}`, {
                as: admin,
                json: { role },
            });

        assert.equal(
            (await save('moderator')).body.data.values.role,
            'moderator',
        );
        assert.equal((await save('admin')).body.data.values.role, 'admin');
        assert.equal(
            (await h.get('/admin/api/schema', { as: grace })).status,
            200,
        );
        assert.equal((await save(null)).body.data.values.role, null);

        const { body } = await h.get(
            `/admin/api/resources/user/${grace.id}/activity`,
            { as: admin },
        );

        assert.partialDeepStrictEqual(body.data[0].actor, {
            key: admin.id,
            resource: 'user',
        });
        assert.equal((await save('owner')).status, 422);
    });
});

describe('admin panel deletes', () => {
    it("deletes a user with what no foreign key reaches: their media, their posts' media, roles, notifications and devices", async () => {
        const gone = await h.signUp('gone@example.test', 'Gone');
        const image = () =>
            fileForm({ content: PNG, type: 'image/png', name: 'photo.png' });
        const post = (
            await h.post('/posts', { as: gone, json: { body: 'Bye' } })
        ).body;

        await h.put('/me/avatar', { as: gone, form: image() });
        await h.post(`/posts/${post.id}/images`, { as: gone, form: image() });
        await h.post('/me/devices', {
            as: gone,
            json: { token: 'ExponentPushToken[gone]' },
        });
        await h.patch(`/admin/api/resources/user/${gone.id}`, {
            as: admin,
            json: { role: 'moderator' },
        });

        const { body } = await h.delete('/admin/api/resources/user', {
            as: admin,
            json: { keys: [gone.id] },
        });

        assert.deepEqual(body, { deleted: 1 });

        const [left] = await h.query(
            `SELECT
                (SELECT count(*) FROM media)::int AS media,
                (SELECT count(*) FROM role_attachment WHERE "modelId" = $1)::int AS roles,
                (SELECT count(*) FROM notification WHERE "modelId" = $1)::int AS notifications,
                (SELECT count(*) FROM device WHERE "modelId" = $1)::int AS devices`,
            [gone.id],
        );

        assert.deepEqual(left, {
            media: 0,
            roles: 0,
            notifications: 0,
            devices: 0,
        });
    });

    it('deletes a post with its images, which no foreign key reaches', async () => {
        const author = await h.signUp('author@example.test', 'Author');
        const post = (
            await h.post('/posts', { as: author, json: { body: 'Gone soon' } })
        ).body;

        await h.post(`/posts/${post.id}/images`, {
            as: author,
            form: fileForm({ content: PNG, type: 'image/png' }),
        });

        const { body } = await h.delete('/admin/api/resources/post', {
            as: admin,
            json: { keys: [post.id] },
        });

        assert.deepEqual(body, { deleted: 1 });
        assert.deepEqual(
            await h.query('SELECT count(*)::int AS media FROM media'),
            [{ media: 0 }],
        );
    });
});

describe('admin panel export', () => {
    it('downloads the users picked as CSV, with their columns and never a password hash', async () => {
        const { status, body } = await h.post(
            '/admin/api/resources/user/actions/export-as-csv',
            { as: admin, json: { keys: [ada.id] } },
        );
        const csv = Buffer.from(body.download.base64, 'base64').toString();

        assert.equal(status, 200);
        assert.match(body.download.filename, /^users-\d{4}-\d{2}-\d{2}\.csv$/);
        assert.match(csv, /^\uFEFFID,Name,Email,Created at\r\n/);
        assert.match(csv, /ada@example\.test/);
        assert.doesNotMatch(csv, /scrypt\$/);
    });

    it('downloads every user with the standalone export, picking none', async () => {
        const { status, body } = await h.post(
            '/admin/api/resources/user/actions/export-all-as-csv',
            { as: admin, json: { keys: [] } },
        );
        const rows = Buffer.from(body.download.base64, 'base64')
            .toString()
            .trim()
            .split('\r\n');

        assert.equal(status, 200);
        assert.ok(rows.some((row) => row.includes('ada@example.test')));
        assert.ok(rows.some((row) => row.includes(ADMIN_EMAIL)));
    });
});

describe('admin panel me', () => {
    it('names who the panel is signed in as', async () => {
        const { status, body } = await h.get('/admin/api/me', { as: admin });

        assert.equal(status, 200);
        assert.partialDeepStrictEqual(body.user, {
            key: admin.id,
            resource: 'user',
        });
    });
});

describe('admin panel pages', () => {
    it('serves the panel at /admin, any of its paths showing the app', async () => {
        for (const path of ['/admin', '/admin/resources/user/1']) {
            const { status, body, headers } = await h.get(path);

            assert.equal(status, 200, path);
            assert.match(body, /<div id="root">/);
            assert.equal(headers.get('cache-control'), 'no-cache');
        }
    });

    it('serves its built assets for good', async () => {
        const page = (await h.get('/admin')).body as string;
        const script = page.match(/src="(\/admin\/assets\/[^"]+\.js)"/)?.[1];

        assert.ok(script);

        const { status, headers } = await h.get(script);

        assert.equal(status, 200);
        assert.match(headers.get('cache-control') ?? '', /immutable/);
        assert.equal((await h.get('/admin/assets/missing.js')).status, 404);
    });

    it('answers an unknown api path with a 404, not the page', async () => {
        assert.equal((await h.get('/admin/api/nothing')).status, 404);
    });

    it('signs in with the api login, for a token the api takes', async () => {
        const { status, body } = await h.post('/admin/api/session', {
            json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        });

        assert.equal(status, 200);
        assert.equal(
            (await h.get('/admin/api/schema', { as: body })).status,
            200,
        );
        assert.equal(
            (
                await h.post('/admin/api/session', {
                    json: { email: ADMIN_EMAIL, password: 'wrong' },
                })
            ).status,
            401,
        );
    });

    it('ends the session on signing out, so its token stops working', async () => {
        const { body: session } = await h.post('/admin/api/session', {
            json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        });

        assert.equal(
            (await h.delete('/admin/api/session', { as: session })).status,
            204,
        );
        assert.equal(
            (await h.get('/admin/api/schema', { as: session })).status,
            401,
        );
    });
});
