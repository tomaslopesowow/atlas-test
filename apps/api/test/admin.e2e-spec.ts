import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
    type Account,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    type Harness,
    startHarness,
} from './harness.js';

let h: Harness;
let admin: Account;
let ada: Account;
let bob: Account;

before(async () => {
    h = await startHarness();
    admin = await h.signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    ada = await h.signUp('ada@example.test', 'Ada');
    bob = await h.signUp('bob@example.test', 'Bob');
});

after(() => h.close());

const roleNamed = async (name: string) =>
    (await h.get('/roles', { as: admin })).body.find(
        (role: { name: string }) => role.name === name,
    );

const permissionsOf = (role: { permissions: { name: string }[] }) =>
    role.permissions.map(({ name }) => name).sort();

describe('roles', () => {
    it('seeds an admin role holding everything, and a moderator role that deletes posts and comments', async () => {
        assert.deepEqual(permissionsOf(await roleNamed('admin')), [
            'delete:comments',
            'delete:posts',
            'read:roles',
            'update:roles',
        ]);
        assert.deepEqual(permissionsOf(await roleNamed('moderator')), [
            'delete:comments',
            'delete:posts',
        ]);
    });

    it('are listed in /me, so a client knows what to offer', async () => {
        assert.deepEqual((await h.get('/me', { as: admin })).body.permissions, [
            'delete:comments',
            'delete:posts',
            'read:roles',
            'update:roles',
        ]);
        assert.deepEqual(
            (await h.get('/me', { as: ada })).body.permissions,
            [],
        );
    });

    it('are for admins only', async () => {
        const moderator = await roleNamed('moderator');

        assert.equal((await h.get('/roles', { as: ada })).status, 403);
        assert.equal(
            (await h.get(`/users/${bob.id}/roles`, { as: ada })).status,
            403,
        );
        assert.equal(
            (await h.put(`/users/${ada.id}/roles/${moderator.id}`, { as: ada }))
                .status,
            403,
        );
    });

    it('makes a user a moderator, telling them, until it is taken back', async () => {
        const moderator = await roleNamed('moderator');
        const post = (await h.post('/posts', { as: bob, json: { body: 'x' } }))
            .body;

        assert.equal(
            (
                await h.put(`/users/${ada.id}/roles/${moderator.id}`, {
                    as: admin,
                })
            ).status,
            200,
        );
        assert.deepEqual(
            (await h.get(`/users/${ada.id}/roles`, { as: admin })).body.map(
                ({ name }: { name: string }) => name,
            ),
            ['moderator'],
        );

        const [granted] = (await h.get('/me/notifications', { as: ada })).body;
        assert.deepEqual(
            [granted.type, granted.payload],
            ['role.granted', { role: 'moderator' }],
        );

        assert.equal(
            (
                await h.delete(`/users/${ada.id}/roles/${moderator.id}`, {
                    as: admin,
                })
            ).status,
            204,
        );
        assert.equal(
            (await h.delete(`/posts/${post.id}`, { as: ada })).status,
            403,
        );

        await h.put(`/users/${ada.id}/roles/${moderator.id}`, { as: admin });
        assert.equal(
            (await h.delete(`/posts/${post.id}`, { as: ada })).status,
            204,
        );
    });

    it('refuses a role twice, a missing role or user, and revoking what was not granted', async () => {
        const moderator = await roleNamed('moderator');

        await h.put(`/users/${bob.id}/roles/${moderator.id}`, { as: admin });

        assert.equal(
            (
                await h.put(`/users/${bob.id}/roles/${moderator.id}`, {
                    as: admin,
                })
            ).status,
            409,
        );
        assert.equal(
            (await h.put(`/users/${bob.id}/roles/99999`, { as: admin })).status,
            404,
        );
        assert.equal(
            (await h.put(`/users/99999/roles/${moderator.id}`, { as: admin }))
                .status,
            404,
        );
        assert.equal(
            (
                await h.delete(`/users/${admin.id}/roles/${moderator.id}`, {
                    as: admin,
                })
            ).status,
            404,
        );
    });

    it('changes nothing on the next boot, and makes the ADMIN_EMAIL user an admin again', async () => {
        const adminRole = await roleNamed('admin');

        await h.delete(`/users/${admin.id}/roles/${adminRole.id}`, {
            as: admin,
        });
        assert.equal((await h.get('/roles', { as: admin })).status, 403);

        await h.restart();

        assert.equal((await h.get('/roles', { as: admin })).status, 200);
        assert.deepEqual(
            await h.query(`SELECT name FROM "role" ORDER BY name`),
            [{ name: 'admin' }, { name: 'moderator' }],
        );
    });
});
