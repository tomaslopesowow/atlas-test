/**
 * Fills the database with made-up users, posts and comments dated from 2025 on, so the admin
 * panel has something to show. Every seeded user signs in with the password `password`.
 * Run again, it replaces what it seeded before: users of `@seed.test`, with their posts and comments.
 *
 *     node --env-file=.env scripts/seed.ts
 */
import pg from 'pg';
import { hashPassword } from '../src/auth/password.ts';

const USERS = 2_000;
const POSTS = 5_000;
const COMMENTS = 10_000;
const BATCH = 1_000;
const DISABLED_SHARE = 0.08;

const START = Date.UTC(2025, 0, 1);
const NOW = Date.now();

const FIRST = [
    'Ada',
    'Alan',
    'Grace',
    'Linus',
    'Margaret',
    'Ken',
    'Barbara',
    'Dennis',
    'Radia',
    'Tim',
    'Frances',
    'Edsger',
    'Hedy',
    'John',
    'Katherine',
    'Guido',
    'Sophie',
    'Bjarne',
    'Joan',
    'Niklaus',
    'Lucia',
    'Mateo',
    'Inês',
    'Tomás',
    'Sofia',
    'Diego',
    'Marta',
    'Pedro',
];
const LAST = [
    'Lovelace',
    'Turing',
    'Hopper',
    'Torvalds',
    'Hamilton',
    'Thompson',
    'Liskov',
    'Ritchie',
    'Perlman',
    'Berners-Lee',
    'Allen',
    'Dijkstra',
    'Lamarr',
    'Backus',
    'Johnson',
    'van Rossum',
    'Wilson',
    'Stroustrup',
    'Clarke',
    'Wirth',
    'Silva',
    'Costa',
    'Santos',
    'Ferreira',
];
const OPENERS = [
    'Just shipped',
    'Thinking about',
    'Anyone else tried',
    'Quick tip on',
    'Finally understood',
    'Hot take on',
    'Week three of',
    'Notes from',
    'Struggling with',
    'Loving',
];
const TOPICS = [
    'the new release',
    'TypeScript generics',
    'Postgres indexes',
    'our design system',
    'remote work',
    'the conference talk',
    'side projects',
    'coffee and code',
    'test coverage',
    'a rainy Sunday',
    'dark mode',
    'the admin panel',
];
const ENDINGS = [
    '.',
    '!',
    ' — thoughts?',
    '. More soon.',
    ', highly recommend.',
    '. What a ride.',
];
const REPLIES = [
    'Great post!',
    'Totally agree.',
    'Thanks for sharing this.',
    'Not sure I agree, but interesting.',
    'Saving this for later.',
    'Same here!',
    'How did you get it working?',
    'This made my day.',
    'Can you share more details?',
    'Love it.',
];

const pick = <T>(list: readonly T[]): T =>
    list[Math.floor(Math.random() * list.length)] as T;

// later dates more often, as a growing app gets more of everything
const dateAfter = (from: number) =>
    new Date(from + (NOW - from) * Math.sqrt(Math.random()));

/** Inserts the rows a batch at a time, resolving with the ids in order. */
async function insert(
    client: pg.Client,
    sql: string,
    columns: unknown[][],
): Promise<number[]> {
    const ids: number[] = [];

    for (let at = 0; at < (columns[0]?.length ?? 0); at += BATCH) {
        const { rows } = await client.query<{ id: number }>(
            sql,
            columns.map((column) => column.slice(at, at + BATCH)),
        );
        ids.push(...rows.map(({ id }) => id));
    }

    return ids;
}

const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

await client.connect();

try {
    await client.query('BEGIN');

    // their posts and comments go with them
    const { rowCount } = await client.query(
        `DELETE FROM "user" WHERE email LIKE '%@seed.test'`,
    );
    if (rowCount) console.log(`Removed ${rowCount} seeded users from before`);

    const hash = await hashPassword({ password: 'password' });
    const users = Array.from({ length: USERS }, (_, i) => {
        const first = pick(FIRST);
        const last = pick(LAST);

        return {
            name: `${first} ${last}`,
            email: `${first}.${last}.${i}@seed.test`
                .toLowerCase()
                .replaceAll(/[^a-z0-9.@-]/g, ''),
            createdAt: dateAfter(START),
        };
    });
    const userIds = await insert(
        client,
        `INSERT INTO "user" (email, "passwordHash", name, "createdAt", "updatedAt")
         SELECT email, hash, name, at, at FROM unnest($1::text[], $2::text[], $3::text[], $4::timestamptz[]) AS t(email, hash, name, at)
         RETURNING id`,
        [
            users.map(({ email }) => email),
            users.map(() => hash),
            users.map(({ name }) => name),
            users.map(({ createdAt }) => createdAt),
        ],
    );
    console.log(`Inserted ${userIds.length} users`);

    const posts = Array.from({ length: POSTS }, () => {
        const author = Math.floor(Math.random() * USERS);

        return {
            authorId: userIds[author],
            body: `${pick(OPENERS)} ${pick(TOPICS)}${pick(ENDINGS)}`,
            status: Math.random() < DISABLED_SHARE ? 'disabled' : 'active',
            createdAt: dateAfter(users[author]?.createdAt.getTime() ?? START),
        };
    });
    const postIds = await insert(
        client,
        `INSERT INTO post ("authorId", body, status, "createdAt", "updatedAt")
         SELECT author, body, status, at, at FROM unnest($1::int[], $2::text[], $3::post_status_enum[], $4::timestamptz[]) AS t(author, body, status, at)
         RETURNING id`,
        [
            posts.map(({ authorId }) => authorId),
            posts.map(({ body }) => body),
            posts.map(({ status }) => status),
            posts.map(({ createdAt }) => createdAt),
        ],
    );
    console.log(`Inserted ${postIds.length} posts`);

    const comments = Array.from({ length: COMMENTS }, () => {
        const post = Math.floor(Math.random() * POSTS);
        const author = Math.floor(Math.random() * USERS);
        const after = Math.max(
            posts[post]?.createdAt.getTime() ?? START,
            users[author]?.createdAt.getTime() ?? START,
        );

        return {
            postId: postIds[post],
            authorId: userIds[author],
            body: pick(REPLIES),
            createdAt: dateAfter(after),
        };
    });
    const commentIds = await insert(
        client,
        `INSERT INTO comment ("postId", "authorId", body, "createdAt")
         SELECT post, author, body, at FROM unnest($1::int[], $2::int[], $3::text[], $4::timestamptz[]) AS t(post, author, body, at)
         RETURNING id`,
        [
            comments.map(({ postId }) => postId),
            comments.map(({ authorId }) => authorId),
            comments.map(({ body }) => body),
            comments.map(({ createdAt }) => createdAt),
        ],
    );
    console.log(`Inserted ${commentIds.length} comments`);

    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    await client.end();
}
