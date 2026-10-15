import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
    type Account,
    eventually,
    fileForm,
    type Harness,
    PNG,
    startHarness,
} from './harness.js';

let h: Harness;
let ada: Account;
let bob: Account;

before(async () => {
    h = await startHarness();
    ada = await h.signUp('ada@example.test', 'Ada');
    bob = await h.signUp('bob@example.test', 'Bob');
});

after(() => h.close());

const png = () => fileForm({ content: PNG, type: 'image/png', name: 'me.png' });

const fileStatus = async (url: string) => (await fetch(h.url + url)).status;

/** Waits for the avatar's sizes, resolving with its urls. */
const convertedAvatar = (user: Account) =>
    eventually(async () => {
        const { avatar } = (await h.get(`/users/${user.id}`, { as: bob })).body;

        return avatar?.conversions.thumb && avatar.conversions.medium
            ? avatar
            : undefined;
    });

describe('GET /me and PATCH /me', () => {
    it('shows the signed-in user, email included', async () => {
        const { status, body } = await h.get('/me', { as: ada });

        assert.equal(status, 200);
        assert.deepEqual(
            { id: body.id, email: body.email, name: body.name },
            { id: ada.id, email: 'ada@example.test', name: 'Ada' },
        );
    });

    it('changes the name, trimmed', async () => {
        const { status, body } = await h.patch('/me', {
            as: ada,
            json: { name: ' Ada L. ' },
        });

        assert.equal(status, 200);
        assert.equal(body.name, 'Ada L.');
    });

    it('refuses a name that is empty or too long, and ignores an email', async () => {
        for (const name of ['', '   ', 'x'.repeat(51)])
            assert.equal(
                (await h.patch('/me', { as: ada, json: { name } })).status,
                400,
                name,
            );

        await h.patch('/me', {
            as: ada,
            json: { name: 'Ada', email: 'taken@x.test' },
        });
        assert.equal(
            (await h.get('/me', { as: ada })).body.email,
            'ada@example.test',
        );
    });
});

describe('GET /users/:id', () => {
    it("shows another user's name and avatar, never their email", async () => {
        const { status, body } = await h.get(`/users/${bob.id}`, { as: ada });

        assert.equal(status, 200);
        assert.deepEqual(Object.keys(body).sort(), [
            'avatar',
            'createdAt',
            'id',
            'name',
        ]);
        assert.equal(body.name, 'Bob');
    });

    it('reports a missing user with a 404, and an id that is not one with a 400', async () => {
        assert.equal((await h.get('/users/99999', { as: ada })).status, 404);
        assert.equal((await h.get('/users/abc', { as: ada })).status, 400);
    });
});

describe('profile picture', () => {
    it('sets the avatar, making its sizes after the response', async () => {
        const { status, body } = await h.put('/me/avatar', {
            as: ada,
            form: png(),
        });

        assert.equal(status, 200);
        assert.match(body.original, /^\/uploads\/user\.avatar\//);
        assert.deepEqual(body.conversions, { thumb: null, medium: null });

        const avatar = await convertedAvatar(ada);

        assert.equal(await fileStatus(avatar.original), 200);
        assert.equal(await fileStatus(avatar.conversions.thumb), 200);
        assert.equal(await fileStatus(avatar.conversions.medium), 200);
    });

    it('replaces the avatar there was, deleting its files', async () => {
        const old = await convertedAvatar(ada);

        await h.put('/me/avatar', { as: ada, form: png() });

        const current = await convertedAvatar(ada);
        assert.notEqual(current.original, old.original);
        assert.equal(await fileStatus(old.original), 404);
        assert.equal(await fileStatus(old.conversions.thumb), 404);
        assert.deepEqual(
            await h.query(
                `SELECT count(*)::int AS n FROM "media_attachment" WHERE "modelType" = 'user' AND "modelId" = $1`,
                [ada.id],
            ),
            [{ n: 1 }],
        );
    });

    it('shows the avatar next to what the user posts', async () => {
        const avatar = await convertedAvatar(ada);
        const { body } = await h.post('/posts', {
            as: ada,
            json: { body: 'Hi' },
        });

        assert.deepEqual(body.author.avatar, avatar);
    });

    it('removes the avatar and its files', async () => {
        const avatar = await convertedAvatar(ada);

        assert.equal((await h.delete('/me/avatar', { as: ada })).status, 204);
        assert.equal(
            (await h.get(`/users/${ada.id}`, { as: bob })).body.avatar,
            null,
        );
        assert.equal(await fileStatus(avatar.original), 404);
        assert.equal(
            (await h.delete('/me/avatar', { as: ada })).status,
            404,
            'no avatar left',
        );
    });

    it('refuses a missing file, a type that is not an image and a file too large', async () => {
        assert.equal(
            (await h.put('/me/avatar', { as: bob, form: fileForm(undefined) }))
                .status,
            400,
        );
        assert.equal(
            (
                await h.put('/me/avatar', {
                    as: bob,
                    form: fileForm({
                        content: 'hello',
                        type: 'text/plain',
                        name: 'a.txt',
                    }),
                })
            ).status,
            415,
        );
        assert.equal(
            (
                await h.put('/me/avatar', {
                    as: bob,
                    form: fileForm({
                        content: Buffer.alloc(150 * 1024),
                        type: 'image/png',
                    }),
                })
            ).status,
            413,
        );
        assert.equal(
            (await h.get(`/users/${bob.id}`, { as: ada })).body.avatar,
            null,
        );
    });

    it('needs a session', async () => {
        assert.equal((await h.put('/me/avatar', { form: png() })).status, 401);
    });
});
