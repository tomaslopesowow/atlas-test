import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { type Account, type Harness, startHarness } from './harness.js';

let h: Harness;
let ada: Account;
let bob: Account;

before(async () => {
    h = await startHarness();
    ada = await h.signUp('ada@example.test', 'Ada');
    bob = await h.signUp('bob@example.test', 'Bob');
});

after(() => h.close());

const inbox = async (user: Account, query = '') =>
    (await h.get(`/me/notifications${query}`, { as: user })).body;

const unread = async (user: Account) =>
    (await h.get('/me/notifications/unread-count', { as: user })).body.count;

describe('inbox', () => {
    it("holds the welcome, then what happens to the user's posts, newest first", async () => {
        const post = (await h.post('/posts', { as: ada, json: { body: 'x' } }))
            .body;

        await h.put(`/posts/${post.id}/like`, { as: bob });
        await h.post(`/posts/${post.id}/comments`, {
            as: bob,
            json: { body: 'y' },
        });

        assert.deepEqual(
            (await inbox(ada)).map(({ type }: { type: string }) => type),
            ['post.commented', 'post.liked', 'user.welcome'],
        );
        assert.deepEqual(
            (await inbox(ada, '?limit=1')).map(
                ({ type }: { type: string }) => type,
            ),
            ['post.commented'],
        );
    });

    it("holds only the user's own notifications", async () => {
        assert.deepEqual(
            (await inbox(bob)).map(({ type }: { type: string }) => type),
            ['user.welcome'],
        );
    });

    it("marks notifications read, only the user's own", async () => {
        const [latest] = await inbox(ada);

        assert.equal(await unread(ada), 3);
        assert.deepEqual(
            (
                await h.post('/me/notifications/read', {
                    as: bob,
                    json: { ids: [latest.id] },
                })
            ).body,
            { count: 0 },
        );
        assert.deepEqual(
            (
                await h.post('/me/notifications/read', {
                    as: ada,
                    json: { ids: [latest.id] },
                })
            ).body,
            { count: 1 },
        );
        assert.equal(await unread(ada), 2);
        assert.deepEqual(
            (await h.post('/me/notifications/read-all', { as: ada })).body,
            { count: 2 },
        );
        assert.equal(await unread(ada), 0);
    });
});

describe('devices', () => {
    it("registers, lists and unregisters the user's phones", async () => {
        const token = 'ExponentPushToken[ada-phone]';

        assert.equal(
            (await h.post('/me/devices', { as: ada, json: { token } })).status,
            204,
        );
        assert.deepEqual(
            (await h.get('/me/devices', { as: ada })).body.map(
                ({ token }: { token: string }) => token,
            ),
            [token],
        );
        assert.equal(
            (
                await h.delete(`/me/devices/${encodeURIComponent(token)}`, {
                    as: ada,
                })
            ).status,
            204,
        );
        assert.deepEqual((await h.get('/me/devices', { as: ada })).body, []);
    });

    it("cannot unregister someone else's phone", async () => {
        const token = 'ExponentPushToken[bob-phone]';

        await h.post('/me/devices', { as: bob, json: { token } });

        assert.equal(
            (
                await h.delete(`/me/devices/${encodeURIComponent(token)}`, {
                    as: ada,
                })
            ).status,
            404,
        );
        assert.equal((await h.get('/me/devices', { as: bob })).body.length, 1);
    });

    it('refuses an unknown push provider with a 400', async () => {
        assert.equal(
            (
                await h.post('/me/devices', {
                    as: ada,
                    json: { token: 'x', provider: 'apns' },
                })
            ).status,
            400,
        );
    });
});
