import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
    type Account,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    eventually,
    fileForm,
    type Harness,
    PNG,
    startHarness,
} from './harness.js';

let h: Harness;
let admin: Account;
let ada: Account;
let bob: Account;
let mod: Account;

before(async () => {
    h = await startHarness();
    admin = await h.signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    ada = await h.signUp('ada@example.test', 'Ada');
    bob = await h.signUp('bob@example.test', 'Bob');
    mod = await h.signUp('mod@example.test', 'Mod');

    const roles = (await h.get('/roles', { as: admin })).body;
    const moderator = roles.find(
        ({ name }: { name: string }) => name === 'moderator',
    );
    await h.put(`/users/${mod.id}/roles/${moderator.id}`, { as: admin });
});

after(() => h.close());

const publish = async (author: Account, body = 'Hello') => {
    const response = await h.post('/posts', { as: author, json: { body } });

    assert.equal(response.status, 201, JSON.stringify(response.body));

    return response.body;
};

const addImage = (post: number, as: Account) =>
    h.post(`/posts/${post}/images`, {
        as,
        form: fileForm({ content: PNG, type: 'image/png', name: 'photo.png' }),
    });

const ids = (posts: { id: number }[]) => posts.map(({ id }) => id);

describe('POST /posts', () => {
    it("publishes a post under the signed-in user's name, with nothing on it yet", async () => {
        const post = await publish(ada, '  First post  ');

        assert.equal(post.body, 'First post');
        assert.deepEqual(post.author, {
            id: ada.id,
            name: 'Ada',
            avatar: null,
        });
        assert.deepEqual(
            {
                images: post.images,
                likeCount: post.likeCount,
                commentCount: post.commentCount,
                likedByMe: post.likedByMe,
            },
            { images: [], likeCount: 0, commentCount: 0, likedByMe: false },
        );
    });

    it("dates the post now, whatever the server's and the database's time zones", async () => {
        const post = await publish(ada);
        const [notification] = (await h.get('/me/notifications', { as: ada }))
            .body;

        for (const date of [
            post.createdAt,
            post.updatedAt,
            notification.createdAt,
        ])
            assert.ok(
                Math.abs(Date.parse(date) - Date.now()) < 60_000,
                `${date} is not now`,
            );
    });

    it('takes the author from the session, never from the body', async () => {
        const { body } = await h.post('/posts', {
            as: ada,
            json: { body: 'Mine', authorId: bob.id },
        });

        assert.equal(body.author.id, ada.id);
    });

    for (const [why, json] of [
        ['no body', {}],
        ['an empty body', { body: '' }],
        ['a body of only spaces', { body: '   ' }],
        ['a body over 5000 characters', { body: 'x'.repeat(5001) }],
        ['a body that is not text', { body: 42 }],
    ] as const)
        it(`refuses ${why} with a 400`, async () => {
            assert.equal(
                (await h.post('/posts', { as: ada, json })).status,
                400,
            );
        });
});

describe('reading posts', () => {
    it("lists everyone's posts newest first, a page at a time", async () => {
        const created = [];

        for (const author of [ada, bob, ada])
            created.push(await publish(author, 'paging'));

        const [newest, middle, oldest] = created.reverse();
        const first = (await h.get('/posts?limit=2', { as: bob })).body;

        assert.deepEqual(ids(first), [newest.id, middle.id]);

        const next = (
            await h.get(`/posts?limit=2&before=${middle.id}`, { as: bob })
        ).body;
        assert.equal(next[0].id, oldest.id);
    });

    it("lists one user's posts", async () => {
        const mine = await publish(bob, 'by bob');
        const { body } = await h.get(`/users/${bob.id}/posts`, { as: ada });

        assert.equal(body[0].id, mine.id);
        assert.ok(
            body.every(
                ({ author }: { author: { id: number } }) =>
                    author.id === bob.id,
            ),
        );
        assert.equal(
            (await h.get('/users/99999/posts', { as: ada })).status,
            404,
        );
    });

    it('shows one post, and reports a missing one with a 404', async () => {
        const post = await publish(ada);

        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: bob })).body.id,
            post.id,
        );
        assert.equal((await h.get('/posts/99999', { as: bob })).status, 404);
        assert.equal((await h.get('/posts/abc', { as: bob })).status, 400);
    });

    for (const query of ['?limit=0', '?limit=51', '?before=abc', '?before=0'])
        it(`refuses "${query}" with a 400`, async () => {
            assert.equal(
                (await h.get(`/posts${query}`, { as: ada })).status,
                400,
            );
        });
});

describe('PATCH /posts/:id', () => {
    it('lets the author change what the post says', async () => {
        const post = await publish(ada, 'before');
        const { status, body } = await h.patch(`/posts/${post.id}`, {
            as: ada,
            json: { body: 'after' },
        });

        assert.equal(status, 200);
        assert.equal(body.body, 'after');
    });

    it('refuses everyone else, moderators and admins included', async () => {
        const post = await publish(ada, 'untouched');

        for (const someone of [bob, mod, admin])
            assert.equal(
                (
                    await h.patch(`/posts/${post.id}`, {
                        as: someone,
                        json: { body: 'mine now' },
                    })
                ).status,
                403,
            );

        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: ada })).body.body,
            'untouched',
        );
    });
});

describe('DELETE /posts/:id', () => {
    it('refuses a user who is not the author', async () => {
        const post = await publish(ada);

        assert.equal(
            (await h.delete(`/posts/${post.id}`, { as: bob })).status,
            403,
        );
        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: bob })).status,
            200,
        );
    });

    it('lets the author delete it, with its likes, comments and images', async () => {
        const post = await publish(ada);

        await h.put(`/posts/${post.id}/like`, { as: bob });
        await h.post(`/posts/${post.id}/comments`, {
            as: bob,
            json: { body: 'Nice' },
        });

        const image = (await addImage(post.id, ada)).body;

        assert.equal(
            (await h.delete(`/posts/${post.id}`, { as: ada })).status,
            204,
        );
        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: ada })).status,
            404,
        );
        assert.equal(
            (await h.delete(`/posts/${post.id}`, { as: ada })).status,
            404,
        );

        for (const table of ['post_like', 'comment'])
            assert.deepEqual(
                await h.query(`SELECT 1 FROM "${table}" WHERE "postId" = $1`, [
                    post.id,
                ]),
                [],
                table,
            );

        assert.deepEqual(
            await h.query(`SELECT 1 FROM "media" WHERE id = $1`, [image.id]),
            [],
        );
        await eventually(
            async () =>
                (await fetch(h.url + image.urls.original)).status === 404,
        );
    });

    it("lets a moderator or an admin delete anyone's post", async () => {
        for (const someone of [mod, admin]) {
            const post = await publish(ada);

            assert.equal(
                (await h.delete(`/posts/${post.id}`, { as: someone })).status,
                204,
            );
        }
    });
});

describe('post images', () => {
    it('lets the author add images, in upload order, with their sizes made after the response', async () => {
        const post = await publish(ada);
        const first = (await addImage(post.id, ada)).body;
        const second = (await addImage(post.id, ada)).body;

        assert.deepEqual(first.urls.conversions, { thumb: null, large: null });

        const shown = await eventually(async () => {
            const { images } = (await h.get(`/posts/${post.id}`, { as: bob }))
                .body;

            return (
                images.every(({ urls }: { urls: { conversions: object } }) =>
                    Object.values(urls.conversions).every(Boolean),
                ) && images
            );
        });

        assert.deepEqual(ids(shown), [first.id, second.id]);
        assert.equal(
            (await fetch(h.url + shown[0].urls.conversions.large)).status,
            200,
        );
    });

    it('allows at most four images a post', async () => {
        const post = await publish(ada);

        for (let image = 0; image < 4; image++)
            assert.equal((await addImage(post.id, ada)).status, 201);

        assert.equal((await addImage(post.id, ada)).status, 400);
    });

    it('refuses anyone but the author, a missing file, and a missing post', async () => {
        const post = await publish(ada);

        assert.equal((await addImage(post.id, bob)).status, 403);
        assert.equal((await addImage(post.id, admin)).status, 403);
        assert.equal(
            (
                await h.post(`/posts/${post.id}/images`, {
                    as: ada,
                    form: fileForm(undefined),
                })
            ).status,
            400,
        );
        assert.equal((await addImage(99999, ada)).status, 404);
    });

    it('lets the author delete an image, with its files', async () => {
        const post = await publish(ada);
        const image = (await addImage(post.id, ada)).body;

        assert.equal(
            (
                await h.delete(`/posts/${post.id}/images/${image.id}`, {
                    as: bob,
                })
            ).status,
            403,
        );
        assert.equal(
            (
                await h.delete(`/posts/${post.id}/images/${image.id}`, {
                    as: ada,
                })
            ).status,
            204,
        );
        assert.deepEqual(
            (await h.get(`/posts/${post.id}`, { as: ada })).body.images,
            [],
        );
        await eventually(
            async () =>
                (await fetch(h.url + image.urls.original)).status === 404,
        );
        assert.equal(
            (
                await h.delete(`/posts/${post.id}/images/${image.id}`, {
                    as: ada,
                })
            ).status,
            404,
            'gone already',
        );
    });

    it("refuses to delete another post's image through this one", async () => {
        const mine = await publish(ada);
        const theirs = await publish(bob);
        const image = (await addImage(theirs.id, bob)).body;

        assert.equal(
            (
                await h.delete(`/posts/${mine.id}/images/${image.id}`, {
                    as: ada,
                })
            ).status,
            404,
        );
        assert.equal(
            (await h.get(`/posts/${theirs.id}`, { as: bob })).body.images
                .length,
            1,
        );
    });
});

describe('PATCH /posts/:id/status', () => {
    it('hides a disabled post from everyone but its author, until enabled again', async () => {
        const post = await publish(ada, 'Hidden for a while');
        const disabled = await h.patch(`/posts/${post.id}/status`, {
            as: ada,
            json: { status: 'disabled' },
        });

        assert.equal(disabled.status, 200);
        assert.equal(disabled.body.status, 'disabled');

        // for bob it is as good as deleted
        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: bob })).status,
            404,
        );
        assert.ok(
            !ids((await h.get('/posts', { as: bob })).body).includes(post.id),
        );
        assert.ok(
            !ids(
                (await h.get(`/users/${ada.id}/posts`, { as: bob })).body,
            ).includes(post.id),
        );
        assert.equal(
            (await h.put(`/posts/${post.id}/like`, { as: bob })).status,
            404,
        );
        assert.equal(
            (await h.get(`/posts/${post.id}/comments`, { as: bob })).status,
            404,
        );
        assert.equal(
            (
                await h.post(`/posts/${post.id}/comments`, {
                    as: bob,
                    json: { body: 'Hi' },
                })
            ).status,
            404,
        );

        // ada still has it, in her feed and on her page
        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: ada })).body.status,
            'disabled',
        );
        assert.ok(
            ids((await h.get('/posts', { as: ada })).body).includes(post.id),
        );
        assert.ok(
            ids(
                (await h.get(`/users/${ada.id}/posts`, { as: ada })).body,
            ).includes(post.id),
        );

        await h.patch(`/posts/${post.id}/status`, {
            as: ada,
            json: { status: 'active' },
        });

        assert.equal(
            (await h.get(`/posts/${post.id}`, { as: bob })).body.status,
            'active',
        );
    });

    it('lets the author alone change it, to a status there is', async () => {
        const post = await publish(ada);

        for (const as of [bob, mod, admin])
            assert.equal(
                (
                    await h.patch(`/posts/${post.id}/status`, {
                        as,
                        json: { status: 'disabled' },
                    })
                ).status,
                403,
            );
        assert.equal(
            (
                await h.patch(`/posts/${post.id}/status`, {
                    as: ada,
                    json: { status: 'gone' },
                })
            ).status,
            400,
        );
    });
});
