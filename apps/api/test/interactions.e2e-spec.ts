import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
    type Account,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    eventually,
    type Harness,
    startHarness,
} from './harness.js';

let h: Harness;
let admin: Account;
let ada: Account;
let bob: Account;
let cy: Account;
let mod: Account;

before(async () => {
    h = await startHarness();
    admin = await h.signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    ada = await h.signUp('ada@example.test', 'Ada');
    bob = await h.signUp('bob@example.test', 'Bob');
    cy = await h.signUp('cy@example.test', 'Cy');
    mod = await h.signUp('mod@example.test', 'Mod');

    const roles = (await h.get('/roles', { as: admin })).body;
    const moderator = roles.find(
        ({ name }: { name: string }) => name === 'moderator',
    );
    await h.put(`/users/${mod.id}/roles/${moderator.id}`, { as: admin });
});

after(() => h.close());

const publish = async (author: Account) =>
    (await h.post('/posts', { as: author, json: { body: 'A post' } })).body;

const notificationsOf = async (user: Account, type: string) =>
    (await h.get('/me/notifications', { as: user })).body.filter(
        (notification: { type: string }) => notification.type === type,
    );

const comment = async (post: number, author: Account, body = 'Nice') => {
    const response = await h.post(`/posts/${post}/comments`, {
        as: author,
        json: { body },
    });

    assert.equal(response.status, 201, JSON.stringify(response.body));

    return response.body;
};

describe('likes', () => {
    it('likes a post once, however often it is asked', async () => {
        const post = await publish(ada);

        assert.deepEqual(
            (await h.put(`/posts/${post.id}/like`, { as: bob })).body,
            {
                likeCount: 1,
                likedByMe: true,
            },
        );
        assert.deepEqual(
            (await h.put(`/posts/${post.id}/like`, { as: bob })).body,
            {
                likeCount: 1,
                likedByMe: true,
            },
        );
    });

    it("counts everyone's likes, and tells each viewer whether they like it", async () => {
        const post = await publish(ada);

        await h.put(`/posts/${post.id}/like`, { as: bob });
        await h.put(`/posts/${post.id}/like`, { as: cy });

        const asBob = (await h.get(`/posts/${post.id}`, { as: bob })).body;
        const asAda = (await h.get(`/posts/${post.id}`, { as: ada })).body;

        assert.deepEqual([asBob.likeCount, asBob.likedByMe], [2, true]);
        assert.deepEqual([asAda.likeCount, asAda.likedByMe], [2, false]);
        assert.equal(
            (await h.get('/posts', { as: bob })).body.find(
                ({ id }: { id: number }) => id === post.id,
            ).likedByMe,
            true,
            'the feed says the same',
        );
    });

    it('takes a like back, and taking it back again changes nothing', async () => {
        const post = await publish(ada);

        await h.put(`/posts/${post.id}/like`, { as: bob });

        for (let time = 0; time < 2; time++)
            assert.deepEqual(
                (await h.delete(`/posts/${post.id}/like`, { as: bob })).body,
                {
                    likeCount: 0,
                    likedByMe: false,
                },
            );
    });

    it('tells the author once per like, and never about their own', async () => {
        const post = await publish(ada);
        const before = (await notificationsOf(ada, 'post.liked')).length;

        await h.put(`/posts/${post.id}/like`, { as: bob });
        await h.put(`/posts/${post.id}/like`, { as: bob });
        await h.put(`/posts/${post.id}/like`, { as: ada });

        const liked = await notificationsOf(ada, 'post.liked');

        assert.equal(liked.length, before + 1);
        assert.deepEqual(liked[0].payload, {
            postId: post.id,
            userId: bob.id,
            name: 'Bob',
        });
    });

    it("pushes the like to the author's phone", async () => {
        await h.post('/me/devices', {
            as: ada,
            json: { token: 'ExponentPushToken[ada]' },
        });

        const post = await publish(ada);

        await h.put(`/posts/${post.id}/like`, { as: cy });

        const push = await eventually(() =>
            h.pushes.find(
                ({ to, data }) =>
                    to === 'ExponentPushToken[ada]' && data?.postId === post.id,
            ),
        );
        assert.equal(push.body, 'Cy likes your post');
    });

    it('reports a missing post with a 404', async () => {
        assert.equal(
            (await h.put('/posts/99999/like', { as: bob })).status,
            404,
        );
        assert.equal(
            (await h.delete('/posts/99999/like', { as: bob })).status,
            404,
        );
    });
});

describe('comments', () => {
    it("comments on a post, under the commenter's name", async () => {
        const post = await publish(ada);
        const created = await comment(post.id, bob, '  Great!  ');

        assert.equal(created.body, 'Great!');
        assert.equal(created.postId, post.id);
        assert.deepEqual(created.author, {
            id: bob.id,
            name: 'Bob',
            avatar: null,
        });
        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: ada })).body.commentCount,
            1,
        );
    });

    it("lists a post's comments oldest first, a page at a time", async () => {
        const post = await publish(ada);
        const created = [];

        for (const author of [bob, cy, bob])
            created.push(await comment(post.id, author));

        const first = (
            await h.get(`/posts/${post.id}/comments?limit=2`, { as: ada })
        ).body;
        assert.deepEqual(
            first.map(({ id }: { id: number }) => id),
            created.slice(0, 2).map(({ id }) => id),
        );

        const next = (
            await h.get(`/posts/${post.id}/comments?after=${first[1].id}`, {
                as: ada,
            })
        ).body;
        assert.deepEqual(
            next.map(({ id }: { id: number }) => id),
            [created[2].id],
        );
    });

    it("tells the post's author, but not about their own comments", async () => {
        const post = await publish(ada);
        const before = (await notificationsOf(ada, 'post.commented')).length;

        const created = await comment(post.id, cy, 'x'.repeat(150));
        await comment(post.id, ada);

        const commented = await notificationsOf(ada, 'post.commented');

        assert.equal(commented.length, before + 1);
        assert.deepEqual(commented[0].payload, {
            postId: post.id,
            commentId: created.id,
            name: 'Cy',
            excerpt: 'x'.repeat(100),
        });
    });

    for (const [why, json] of [
        ['no body', {}],
        ['a body of only spaces', { body: '  ' }],
        ['a body over 2000 characters', { body: 'x'.repeat(2001) }],
    ] as const)
        it(`refuses ${why} with a 400`, async () => {
            const post = await publish(ada);

            assert.equal(
                (await h.post(`/posts/${post.id}/comments`, { as: bob, json }))
                    .status,
                400,
            );
        });

    it('reports a missing post with a 404', async () => {
        assert.equal(
            (
                await h.post('/posts/99999/comments', {
                    as: bob,
                    json: { body: 'x' },
                })
            ).status,
            404,
        );
        assert.equal(
            (await h.get('/posts/99999/comments', { as: bob })).status,
            404,
        );
    });
});

describe('deleting comments', () => {
    it('lets the commenter delete their comment', async () => {
        const post = await publish(ada);
        const created = await comment(post.id, bob);

        assert.equal(
            (await h.delete(`/comments/${created.id}`, { as: bob })).status,
            204,
        );
        assert.deepEqual(
            (await h.get(`/posts/${post.id}/comments`, { as: ada })).body,
            [],
        );
        assert.equal(
            (await h.delete(`/comments/${created.id}`, { as: bob })).status,
            404,
        );
    });

    it("lets the post's author delete any comment on it", async () => {
        const post = await publish(ada);
        const created = await comment(post.id, bob);

        assert.equal(
            (await h.delete(`/comments/${created.id}`, { as: ada })).status,
            204,
        );
    });

    it('lets a moderator delete any comment', async () => {
        const post = await publish(ada);
        const created = await comment(post.id, bob);

        assert.equal(
            (await h.delete(`/comments/${created.id}`, { as: mod })).status,
            204,
        );
    });

    it('refuses anyone else', async () => {
        const post = await publish(ada);
        const created = await comment(post.id, bob);

        assert.equal(
            (await h.delete(`/comments/${created.id}`, { as: cy })).status,
            403,
        );
        assert.equal(
            (await h.get(`/posts/${post.id}/comments`, { as: cy })).body.length,
            1,
        );
    });
});
