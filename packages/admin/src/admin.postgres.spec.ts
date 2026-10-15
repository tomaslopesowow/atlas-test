import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';
import { type INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type {
    ActionResponse,
    ActivityResponse,
    AdminSchema,
    DashboardResponse,
    DeleteResponse,
    ListResponse,
    MetricResult,
    OptionsResponse,
    RecordResponse,
    RelatedKeysResponse,
    SearchResponse,
    UploadResponse,
    ValidationErrorResponse,
} from '@repo/admin-contract';
import { IsEmail, Length } from 'class-validator';
import {
    DataSource,
    type FindOperator,
    MoreThan,
    type Repository,
} from 'typeorm';
import { Action } from './actions/action.js';
import { AdminModule } from './admin.module.js';
import { AdminAuthenticator } from './auth/admin-authenticator.js';
import {
    BelongsTo,
    BelongsToMany,
    BooleanField,
    DateField,
    DateTime,
    Email,
    FileField,
    HasMany,
    ID,
    Json,
    NumberField,
    Password,
    Select,
    Text,
    Textarea,
} from './fields/field.js';
import { BooleanFilter, DateFilter, Filter } from './filters/filter.js';
import { byPeriod, countBy, latest } from './metrics/aggregates.js';
import { Dashboard, Partition, Table, Trend, Value } from './metrics/metric.js';
import { Resource } from './resources/resource.js';
import {
    AuthorEntity,
    ENTITIES,
    NoteEntity,
    PostEntity,
    PostStatus,
    TagEntity,
} from './testing/entities.js';
import type {
    DeleteRecordsInput,
    MetricInput,
    RangeOption,
} from './types/types.js';

// the endpoints over a real Postgres: TEST_DATABASE_URL=postgres://user:password@localhost:5432/db
const url = process.env.TEST_DATABASE_URL;

// lets in every request but one asking not to be, as an app's guard would its admins
class TestLogin extends AdminAuthenticator {
    async login() {
        return null;
    }

    async authorize({ request }: { request: object }) {
        return !(request as { headers: Record<string, unknown> }).headers[
            'x-refuse'
        ];
    }
}

class CreateAuthorInput {
    @Length(2, 50)
    name!: string;

    @IsEmail()
    email!: string;
}

class PublishAction extends Action<PostEntity> {
    override fields() {
        return [
            NumberField.make('bonusViews').nullable().constraints({ min: 0 }),
        ];
    }

    override async handle({
        records,
        values,
        repository,
    }: {
        records: PostEntity[];
        values: Record<string, unknown>;
        repository: Repository<PostEntity>;
    }) {
        for (const post of records) {
            post.status = PostStatus.Published;
            post.views += Number(values.bonusViews ?? 0);
        }

        await repository.save(records);

        return { message: `Published ${records.length}` };
    }
}

class ReportAction extends Action<PostEntity> {
    override standalone = true;

    override async handle({
        repository,
    }: {
        repository: Repository<PostEntity>;
    }) {
        return {
            message: 'Report ready',
            download: {
                filename: 'report.txt',
                contentType: 'text/plain',
                content: `${await repository.count()} posts`,
            },
        };
    }
}

class TouchAction extends Action<PostEntity> {
    override async handle() {
        return undefined;
    }
}

// a card of its own: a month a point over a year, a year a point since ever
class PostsPerMonthMetric extends Trend<PostEntity> {
    override async calculate({ range, repository }: MetricInput<PostEntity>) {
        return byPeriod({
            repository,
            range,
            unit: range === 'all' ? 'year' : 'month',
        });
    }
}

class LatestPostsMetric extends Table {
    override async calculate({ range, dataSource }: MetricInput) {
        const posts = await latest({
            repository: dataSource.getRepository(PostEntity),
            range,
            limit: 2,
        });

        return {
            caption: `${posts.length} shown`,
            rows: posts.map((post) => ({
                title: post.title,
                value: post.views,
                link: { resource: 'blog-post', key: post.id },
            })),
        };
    }
}

class BrokenMetric extends Value {
    override async calculate(): Promise<never> {
        throw new Error('down');
    }
}

class MainDashboard extends Dashboard {
    override ranges: RangeOption[] = [30, 'all'];
    override defaultRange = 30;

    override cards() {
        return [
            new Value({
                entity: PostEntity,
                name: 'authors',
                fn: 'average',
                of: 'views',
            }),
            new LatestPostsMetric(),
            new BrokenMetric(),
        ];
    }
}

const STATUSES = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
];

class StatusFilter extends Filter<PostEntity> {
    override options() {
        return STATUSES;
    }

    override apply({ value }: { value: string | number }) {
        return { status: value as PostStatus };
    }
}

class FeaturedFilter extends BooleanFilter<PostEntity> {
    override apply({ value }: { value: boolean }) {
        return { featured: value };
    }
}

class PublishOnFilter extends DateFilter<PostEntity> {
    override apply({ value }: { value: FindOperator<never> }) {
        return { publishOn: value };
    }
}

class CreatedAtFilter extends DateFilter<PostEntity> {
    override apply({ value }: { value: FindOperator<never> }) {
        return { createdAt: value };
    }
}

class PopularFilter extends Filter<PostEntity> {
    override options() {
        return [{ value: 'yes', label: 'Popular' }];
    }

    override apply() {
        return { views: MoreThan(100) };
    }
}

class PostResource extends Resource<PostEntity> {
    entity = PostEntity;

    override fields() {
        return [
            ID.make(),
            Text.make('title')
                .sortable()
                .required()
                .constraints({ maxLength: 200 }),
            Textarea.make('body').nullable(),
            Select.make('status').options(STATUSES).sortable(),
            NumberField.make('views').sortable().constraints({ integer: true }),
            BooleanField.make('featured').sortable(),
            DateField.make('publishOn').sortable().nullable(),
            DateTime.make('publishedAt').sortable().nullable(),
            Json.make('meta'),
            Text.make('externalId', 'External ID').sortable().nullable(),
            DateTime.make('createdAt').sortable().readonly().exceptOnForms(),
            BelongsTo.make('author').sortable().nullable(),
            BelongsToMany.make('tags'),
        ];
    }

    override ranges: RangeOption[] = [
        7,
        30,
        '2024',
        { value: 'all', label: 'Since ever' },
    ];

    override cards() {
        return [
            new Value({ name: 'new-posts' }),
            new Trend({ name: 'views-per-day', fn: 'sum', of: 'views' }),
            new Value({ name: 'posts' }),
            new PostsPerMonthMetric(),
            new Partition({ column: 'status', label: 'Posts by status' }),
        ];
    }

    override filters() {
        return [
            new StatusFilter(),
            new FeaturedFilter(),
            new PublishOnFilter(),
            new CreatedAtFilter(),
            new PopularFilter(),
        ];
    }

    override actions() {
        return [new PublishAction(), new TouchAction(), new ReportAction()];
    }
}

class AuthorResource extends Resource<AuthorEntity> {
    entity = AuthorEntity;

    override createDto = CreateAuthorInput;

    override fields() {
        return [
            ID.make(),
            Text.make('name').sortable().required(),
            Email.make('email').sortable().required(),
            HasMany.make('posts'),
            Password.make('passwordHash', 'Password').nullable(),
            FileField.make('avatar')
                .nullable()
                .acceptedTypes('image/*')
                .maxSize(1_000)
                .store(async ({ file }) => `avatars/${file.name}`)
                .preview((value) => `https://cdn.test/${value}`),
        ];
    }
}

// asks for a pin, which the activity log must name but never keep
class LockAction extends Action<NoteEntity> {
    override fields() {
        return [Password.make('pin')];
    }

    override async handle() {
        return { message: 'Locked' };
    }
}

// the notes again, without their deletedAt field, which restoring must not depend on; deleted
// and restored through the entities, as an app's override does to fire its subscribers
class BareNoteResource extends Resource<NoteEntity> {
    entity = NoteEntity;
    override uriKey = 'bare-note';

    override fields() {
        return [ID.make(), Text.make('text')];
    }

    override async delete({
        records,
        repository,
    }: DeleteRecordsInput<NoteEntity>) {
        return (await repository.softRemove(records)).length;
    }

    override async restore({
        records,
        repository,
    }: DeleteRecordsInput<NoteEntity>) {
        return (await repository.recover(records)).length;
    }
}

class NoteResource extends Resource<NoteEntity> {
    entity = NoteEntity;

    override actions() {
        return [new LockAction()];
    }

    override title = 'text';

    override fields() {
        return [
            ID.make(),
            Text.make('text').sortable().required(),
            DateTime.make('deletedAt')
                .sortable()
                .nullable()
                .readonly()
                .exceptOnForms(),
        ];
    }
}

class TagResource extends Resource<TagEntity> {
    entity = TagEntity;

    override countRows = false;

    override fields() {
        return [
            ID.make().showOnCreating().required(),
            // not required(), so the column's NOT NULL answers for it
            Text.make('label').sortable(),
            Text.make('color').sortable().nullable(),
            BelongsToMany.make('posts').readonly(),
        ];
    }
}

describe('admin endpoints against Postgres', {
    skip: !url && 'TEST_DATABASE_URL is unset',
}, () => {
    // a schema of its own, so the run touches nothing else in the database
    const schema = `admin_test_${randomUUID().replaceAll('-', '')}`;
    let app: INestApplication;
    let dataSource: DataSource;
    let base: string;

    const call = async <T>(
        method: string,
        path: string,
        body?: unknown,
    ): Promise<{ status: number; body: T }> => {
        const response = await fetch(`${base}${path}`, {
            method,
            headers: { 'content-type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        return { status: response.status, body: (await response.json()) as T };
    };

    const createPost = async (values: Record<string, unknown>) =>
        (await call<RecordResponse>('POST', '/resources/blog-post', values))
            .body.data;

    before(async () => {
        const admin = new DataSource({ type: 'postgres', url });
        await admin.initialize();
        await admin.query(`CREATE SCHEMA "${schema}"`);
        await admin.destroy();

        @Module({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    url,
                    schema,
                    entities: ENTITIES,
                    synchronize: true,
                }),
                AdminModule,
            ],
            providers: [
                NoteResource,
                BareNoteResource,
                PostResource,
                AuthorResource,
                TagResource,
                MainDashboard,
                TestLogin,
            ],
        })
        class AppModule {}

        const module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module.createNestApplication({ logger: false });
        await app.listen(0, '127.0.0.1');
        base = `${await app.getUrl()}/admin/api`;
        dataSource = app.get(DataSource);
    });

    after(async () => {
        await dataSource?.query(`DROP SCHEMA "${schema}" CASCADE`);
        await app?.close();
    });

    beforeEach(async () => {
        await dataSource.query(
            `TRUNCATE "${schema}"."admin_activity", "${schema}"."note", "${schema}"."post_tag", "${schema}"."blog_post", "${schema}"."author", "${schema}"."tag" RESTART IDENTITY CASCADE`,
        );
    });

    it('answers only the requests its AdminAuthenticator authorizes', async () => {
        const refused = await fetch(`${base}/schema`, {
            headers: { 'x-refuse': '1' },
        });

        assert.equal(refused.status, 403);
    });

    describe('create', () => {
        it('stores a record, with the database filling in its defaults', async () => {
            const { status, body } = await call<RecordResponse>(
                'POST',
                '/resources/blog-post',
                {
                    title: 'Hello',
                    publishOn: '2026-10-08',
                    meta: { tags: ['a'] },
                },
            );

            assert.equal(status, 201);
            assert.equal(body.data.key, 1);
            assert.equal(body.data.title, 'Hello');
            assert.partialDeepStrictEqual(body.data.values, {
                id: 1,
                title: 'Hello',
                status: 'draft',
                views: 0,
                featured: false,
                publishOn: '2026-10-08',
                meta: { tags: ['a'] },
            });
            assert.ok(Date.parse(String(body.data.values.createdAt)));
        });

        it('refuses invalid values with 422, by field', async () => {
            const { status, body } = await call<ValidationErrorResponse>(
                'POST',
                '/resources/blog-post',
                { views: '3', status: 'gone', publishedAt: 'soon' },
            );

            assert.equal(status, 422);
            assert.deepEqual(body.errors, {
                title: ['Title is required'],
                views: ['Views must be a number'],
                status: ['Status must be one of the options'],
                publishedAt: ['Published at must be a date and time'],
            });
        });

        it("checks the resource's DTO too", async () => {
            const { status, body } = await call<ValidationErrorResponse>(
                'POST',
                '/resources/author',
                { name: 'A', email: 'ada@example.test' },
            );

            assert.equal(status, 422);
            assert.deepEqual(Object.keys(body.errors), ['name']);
        });

        it('ignores what the resource does not let it write', async () => {
            const { body } = await call<RecordResponse>(
                'POST',
                '/resources/blog-post',
                {
                    title: 'Hello',
                    id: 99,
                    createdAt: '2000-01-01T00:00:00Z',
                    internalNotes: 'x',
                },
            );

            assert.equal(body.data.key, 1);
            assert.notEqual(
                body.data.values.createdAt,
                '2000-01-01T00:00:00.000Z',
            );
            assert.deepEqual(
                await dataSource.query(
                    `SELECT "internalNotes" FROM "${schema}"."blog_post"`,
                ),
                [{ internalNotes: null }],
            );
        });

        it('writes a password, and never sends it back', async () => {
            const { body } = await call<RecordResponse>(
                'POST',
                '/resources/author',
                {
                    name: 'Ada',
                    email: 'ada@example.test',
                    passwordHash: 'hashed',
                },
            );

            assert.ok(!('passwordHash' in body.data.values));
            assert.deepEqual(
                await dataSource.query(
                    `SELECT "passwordHash" FROM "${schema}"."author"`,
                ),
                [{ passwordHash: 'hashed' }],
            );
        });

        it('reports a unique value taken with 409', async () => {
            const ada = { name: 'Ada', email: 'ada@example.test' };
            await call('POST', '/resources/author', ada);

            const { status } = await call('POST', '/resources/author', ada);

            assert.equal(status, 409);
        });

        it('refuses a NOT NULL column left empty with 422, by field', async () => {
            const { status, body } = await call<ValidationErrorResponse>(
                'POST',
                '/resources/tag',
                { id: randomUUID() },
            );

            assert.equal(status, 422);
            assert.deepEqual(body.errors, { label: ['Label is required'] });
        });

        it('takes a primary key the database does not generate', async () => {
            const id = randomUUID();
            const { status, body } = await call<RecordResponse>(
                'POST',
                '/resources/tag',
                {
                    id,
                    label: 'news',
                },
            );

            assert.equal(status, 201);
            assert.equal(body.data.key, id);
        });
    });

    describe('list', () => {
        beforeEach(async () => {
            for (let n = 1; n <= 30; n++)
                await createPost({
                    title: `Post ${String(n).padStart(2, '0')}`,
                });
        });

        it('pages newest first, with a total', async () => {
            const { body } = await call<ListResponse>(
                'GET',
                '/resources/blog-post?page=2',
            );

            assert.deepEqual(body.meta, {
                page: 2,
                perPage: 25,
                total: 30,
                lastPage: 2,
                hasMore: false,
            });
            assert.deepEqual(
                body.data.map(({ key }) => key),
                [5, 4, 3, 2, 1],
            );
        });

        it("sends a row's values its index shows, a record's those its pages show, and whether it is deleted", async () => {
            const { body: list } = await call<ListResponse>(
                'GET',
                '/resources/blog-post?perPage=10',
            );
            const { body: one } = await call<RecordResponse>(
                'GET',
                '/resources/blog-post/1',
            );

            assert.equal('body' in (list.data[0]?.values ?? {}), false);
            assert.equal('body' in one.data.values, true);

            await call('POST', '/resources/bare-note', { text: 'a' });

            // no field of its own shows when it was deleted, which a list still says
            assert.deepEqual(
                (await call<ListResponse>('GET', '/resources/bare-note')).body
                    .data[0]?.values,
                { deletedAt: null, id: 1, text: 'a' },
            );
        });

        it('sorts by a sortable field, ascending unless told otherwise', async () => {
            const { body } = await call<ListResponse>(
                'GET',
                '/resources/blog-post?sort=title&perPage=50',
            );
            const { body: reversed } = await call<ListResponse>(
                'GET',
                '/resources/blog-post?sort=title&direction=desc&perPage=50',
            );

            assert.equal(body.data[0]?.title, 'Post 01');
            assert.equal(reversed.data[0]?.title, 'Post 30');
        });

        it('falls back to the default sort and page size for what it does not allow', async () => {
            const { body } = await call<ListResponse>(
                'GET',
                '/resources/blog-post?sort=meta&perPage=7&page=-1',
            );

            assert.equal(body.data[0]?.key, 30);
            assert.equal(body.meta.perPage, 25);
            assert.equal(body.meta.page, 1);
        });

        it('searches the text columns, regardless of case, with % and _ taken literally', async () => {
            await createPost({ title: 'Half_price', body: '100% off' });

            const found = async (search: string) =>
                (
                    await call<ListResponse>(
                        'GET',
                        `/resources/blog-post?search=${encodeURIComponent(search)}`,
                    )
                ).body.data.map(({ title }) => title);

            assert.deepEqual(await found('POST 2'), [
                'Post 29',
                'Post 28',
                'Post 27',
                'Post 26',
                'Post 25',
                'Post 24',
                'Post 23',
                'Post 22',
                'Post 21',
                'Post 20',
            ]);
            assert.deepEqual(await found('100%'), ['Half_price']);
            assert.deepEqual(await found('Pos_ 01'), []);
        });

        it('pages without counting for a resource that does not count', async () => {
            for (let n = 0; n < 26; n++)
                await call('POST', '/resources/tag', {
                    id: randomUUID(),
                    label: `tag ${n}`,
                });

            const { body } = await call<ListResponse>('GET', '/resources/tag');

            assert.equal(body.data.length, 25);
            assert.partialDeepStrictEqual(body.meta, {
                total: null,
                lastPage: null,
                hasMore: true,
            });
        });
    });

    describe('show, update and delete', () => {
        it('shows a record, and 404 for one that does not exist or a key its column cannot hold', async () => {
            await createPost({ title: 'Hello' });

            assert.equal(
                (await call('GET', '/resources/blog-post/1')).status,
                200,
            );

            for (const key of ['2', 'abc', '99999999999'])
                assert.equal(
                    (await call('GET', `/resources/blog-post/${key}`)).status,
                    404,
                    key,
                );

            assert.equal(
                (await call('GET', '/resources/tag/not-a-uuid')).status,
                404,
            );
            assert.equal((await call('GET', '/resources/ghost/1')).status, 404);
        });

        it('updates only the values given, leaving readonly ones', async () => {
            const created = await createPost({ title: 'Hello', body: 'Text' });

            const { status, body } = await call<RecordResponse>(
                'PATCH',
                '/resources/blog-post/1',
                {
                    title: 'Renamed',
                    body: null,
                    createdAt: '2000-01-01T00:00:00Z',
                },
            );

            assert.equal(status, 200);
            assert.partialDeepStrictEqual(body.data.values, {
                title: 'Renamed',
                body: null,
                status: 'draft',
                createdAt: created.values.createdAt,
            });
        });

        it('deletes by key, saying how many went', async () => {
            await createPost({ title: 'One' });
            await createPost({ title: 'Two' });

            const { body } = await call<DeleteResponse>(
                'DELETE',
                '/resources/blog-post',
                {
                    keys: [1, 2, 3],
                },
            );

            assert.deepEqual(body, { deleted: 2 });
            assert.equal(
                (await call('DELETE', '/resources/blog-post', { keys: [] }))
                    .status,
                400,
            );
        });

        it('refuses with 409 to delete a record others refer to', async () => {
            await call('POST', '/resources/author', {
                name: 'Ada',
                email: 'ada@example.test',
            });
            await dataSource.query(
                `INSERT INTO "${schema}"."blog_post" (title, "authorId") VALUES ('Hello', 1)`,
            );

            const { status } = await call('DELETE', '/resources/author', {
                keys: [1],
            });

            assert.equal(status, 409);
        });
    });

    describe('relations', () => {
        const author = async (name: string) =>
            (
                await call<RecordResponse>('POST', '/resources/author', {
                    name,
                    email: `${name.toLowerCase()}@example.test`,
                })
            ).body.data;

        it('points a belongsTo at the record whose key it is given, and shows its title', async () => {
            await author('Ada');

            const { status, body } = await call<RecordResponse>(
                'POST',
                '/resources/blog-post',
                {
                    title: 'Hello',
                    author: 1,
                },
            );

            assert.equal(status, 201);
            assert.deepEqual(body.data.values.author, { key: 1, title: 'Ada' });
            assert.deepEqual(
                (await call<ListResponse>('GET', '/resources/blog-post')).body
                    .data[0]?.values.author,
                { key: 1, title: 'Ada' },
            );
        });

        it('refuses a belongsTo to a record that does not exist, and clears one given null', async () => {
            await author('Ada');
            await createPost({ title: 'Hello', author: 1 });

            const { status, body } = await call<ValidationErrorResponse>(
                'PATCH',
                '/resources/blog-post/1',
                { author: 7 },
            );
            const cleared = await call<RecordResponse>(
                'PATCH',
                '/resources/blog-post/1',
                {
                    author: null,
                },
            );

            assert.equal(status, 422);
            assert.deepEqual(body.errors, { author: ['Author: no author 7'] });
            assert.equal(cleared.body.data.values.author, null);
        });

        it("lists a record's hasMany records, as their own resource does", async () => {
            await author('Ada');
            await author('Grace');
            for (const [title, by] of [
                ['One', 1],
                ['Two', 2],
                ['Three', 1],
            ] as const)
                await createPost({ title, author: by });

            const { body } = await call<ListResponse>(
                'GET',
                '/resources/author/1/relations/posts?sort=title',
            );

            assert.deepEqual(
                body.data.map(({ title }) => title),
                ['One', 'Three'],
            );
            assert.equal(body.meta.total, 2);
            assert.equal(
                (await call('GET', '/resources/author/1/relations/email'))
                    .status,
                404,
            );
        });

        it('attaches and detaches the records of a belongsToMany, and lists them from either side', async () => {
            const [news, tech] = [randomUUID(), randomUUID()];
            await call('POST', '/resources/tag', { id: news, label: 'news' });
            await call('POST', '/resources/tag', { id: tech, label: 'tech' });
            await createPost({ title: 'Hello' });

            const attached = await call<RelatedKeysResponse>(
                'POST',
                '/resources/blog-post/1/relations/tags/attach',
                { keys: [news, tech] },
            );
            const tags = async () =>
                (
                    await call<ListResponse>(
                        'GET',
                        '/resources/blog-post/1/relations/tags?sort=label',
                    )
                ).body.data.map(({ title }) => title);

            assert.deepEqual(attached.body, { count: 2 });
            assert.deepEqual(await tags(), ['news', 'tech']);
            assert.deepEqual(
                (
                    await call<ListResponse>(
                        'GET',
                        `/resources/tag/${news}/relations/posts`,
                    )
                ).body.data.map(({ title }) => title),
                ['Hello'],
            );

            // a uuid in capitals is the one Postgres keeps in lowercase
            await call('POST', '/resources/blog-post/1/relations/tags/detach', {
                keys: [news.toUpperCase()],
            });

            assert.deepEqual(await tags(), ['tech']);
            // one linked already, or given twice, changes nothing, rather than failing the batch on a duplicate
            assert.deepEqual(
                (
                    await call(
                        'POST',
                        '/resources/blog-post/1/relations/tags/attach',
                        { keys: [tech, news, news] },
                    )
                ).body,
                { count: 1 },
            );
            // a readonly() side is only listed
            assert.equal(
                (
                    await call(
                        'POST',
                        `/resources/tag/${news}/relations/posts/attach`,
                        { keys: [1] },
                    )
                ).status,
                400,
            );
        });

        it('offers records to pick by title, searched by it', async () => {
            await author('Grace');
            await author('Ada');
            await author('Adele');

            const { body } = await call<OptionsResponse>(
                'GET',
                '/resources/author/options?search=ad',
            );

            assert.deepEqual(body, {
                data: [
                    { key: 2, title: 'Ada' },
                    { key: 3, title: 'Adele' },
                ],
                hasMore: false,
            });
        });
    });

    describe('filters', () => {
        beforeEach(async () => {
            await createPost({
                title: 'Draft',
                views: 5,
                publishOn: '2026-10-01',
            });
            await createPost({
                title: 'Live',
                status: 'published',
                views: 500,
                featured: true,
                publishOn: '2026-10-10',
            });
            await createPost({
                title: 'Old',
                status: 'published',
                views: 50,
                publishOn: '2026-09-01',
            });
        });

        const titles = async (query: string) =>
            (
                await call<ListResponse>(
                    'GET',
                    `/resources/blog-post?sort=title&${query}`,
                )
            ).body.data.map(({ title }) => title);

        it('filters by a select, a boolean, and both at once', async () => {
            assert.deepEqual(await titles('filter.status=published'), [
                'Live',
                'Old',
            ]);
            assert.deepEqual(await titles('filter.featured=false'), [
                'Draft',
                'Old',
            ]);
            assert.deepEqual(
                await titles('filter.status=published&filter.featured=true'),
                ['Live'],
            );
        });

        it('filters by days, both ends included, on a date and on a datetime column', async () => {
            assert.deepEqual(
                await titles(
                    'filter.publish-on.from=2026-10-01&filter.publish-on.to=2026-10-10',
                ),
                ['Draft', 'Live'],
            );
            assert.deepEqual(await titles('filter.publish-on.to=2026-09-30'), [
                'Old',
            ]);

            const today = new Date().toISOString().slice(0, 10);
            assert.deepEqual(
                await titles(
                    `filter.created-at.from=${today}&filter.created-at.to=${today}`,
                ),
                ['Draft', 'Live', 'Old'],
            );
            assert.deepEqual(
                await titles('filter.created-at.to=2000-01-01'),
                [],
            );
        });

        it('applies the condition of a filter of its own, and combines filters with a search', async () => {
            assert.deepEqual(await titles('filter.popular=yes'), ['Live']);
            assert.deepEqual(
                await titles('filter.status=published&search=ol'),
                ['Old'],
            );
        });

        it('ignores a filter value it cannot take', async () => {
            assert.deepEqual(
                await titles(
                    'filter.status=gone&filter.featured=maybe&filter.publish-on.from=soon',
                ),
                ['Draft', 'Live', 'Old'],
            );
        });
    });

    describe('values the calendar or Postgres cannot take', () => {
        it('refuses a day no calendar has with 422, and ignores one in a filter', async () => {
            const { status, body } = await call<ValidationErrorResponse>(
                'POST',
                '/resources/blog-post',
                { title: 'Hello', publishOn: '2026-13-01' },
            );

            assert.equal(status, 422);
            assert.ok(body.errors.publishOn);
            assert.equal(
                (
                    await call(
                        'GET',
                        '/resources/blog-post?filter.created-at.from=2026-13-01&filter.created-at.to=9999-12-31',
                    )
                ).status,
                200,
            );
        });

        it('refuses with 422 a value its column cannot hold, saying why', async () => {
            for (const values of [
                { title: 'Big', views: 3_000_000_000 },
                { title: 'Early', publishOn: '0000-01-01' },
            ]) {
                const { status, body } = await call<ValidationErrorResponse>(
                    'POST',
                    '/resources/blog-post',
                    values,
                );

                assert.equal(status, 422);
                assert.match(body.message, /out of range/);
            }
        });

        it('takes a page past any there is as the last one Postgres can offset to', async () => {
            for (const path of [
                '/activity?page=Infinity',
                '/resources/blog-post?page=1e300',
            ])
                assert.equal((await call('GET', path)).status, 200, path);
        });
    });

    describe('actions', () => {
        it('runs on the records given, with the values of its fields, saying what it did', async () => {
            await createPost({ title: 'One', views: 1 });
            await createPost({ title: 'Two', views: 2 });

            const { status, body } = await call<ActionResponse>(
                'POST',
                '/resources/blog-post/actions/publish',
                {
                    keys: [1, 2],
                    values: { bonusViews: 10 },
                },
            );
            const { body: list } = await call<ListResponse>(
                'GET',
                '/resources/blog-post?sort=title',
            );

            assert.equal(status, 200);
            assert.deepEqual(body, { message: 'Published 2' });
            assert.deepEqual(
                list.data.map(({ values }) => [values.status, values.views]),
                [
                    ['published', 11],
                    ['published', 12],
                ],
            );
        });

        it('says how many it ran on when the action says nothing', async () => {
            await createPost({ title: 'One' });

            const { body } = await call<ActionResponse>(
                'POST',
                '/resources/blog-post/actions/touch',
                {
                    keys: [1],
                },
            );

            assert.deepEqual(body, { message: 'Touch: done for 1 post' });
        });

        it('refuses invalid values, no keys, and an action the resource does not have', async () => {
            await createPost({ title: 'One' });

            const invalid = await call<ValidationErrorResponse>(
                'POST',
                '/resources/blog-post/actions/publish',
                {
                    keys: [1],
                    values: { bonusViews: -1 },
                },
            );

            assert.equal(invalid.status, 422);
            assert.deepEqual(invalid.body.errors, {
                bonusViews: ['Bonus views must be at least 0'],
            });
            assert.equal(
                (
                    await call('POST', '/resources/blog-post/actions/publish', {
                        keys: [],
                    })
                ).status,
                400,
            );
            assert.equal(
                (
                    await call('POST', '/resources/blog-post/actions/archive', {
                        keys: [1],
                    })
                ).status,
                404,
            );
        });
    });

    describe('metrics', () => {
        const ago = (days: number) =>
            new Date(Date.now() - days * 86_400_000).toISOString();

        beforeEach(async () => {
            for (const [title, views, status, days] of [
                ['New', 10, 'draft', 0],
                ['Recent', 20, 'published', 3],
                ['Month', 30, 'published', 20],
                ['Older', 40, 'draft', 45],
            ] as const)
                await dataSource.query(
                    `INSERT INTO "${schema}"."blog_post" (title, views, status, "createdAt") VALUES ($1, $2, $3, $4)`,
                    [title, views, status, ago(days)],
                );
        });

        // a card of the posts' index, for the range of the page, as the panel asks for them all
        const metric = async (path: string) => {
            const [, name, query] =
                /\/metrics\/([^?]+)\??(.*)/.exec(path) ?? [];
            const { body } = await call<DashboardResponse>(
                'GET',
                `/resources/blog-post/cards?${query}`,
            );

            return body.cards.find((card) => card.name === name)
                ?.result as MetricResult;
        };

        it('counts the rows of the range, and of the one before it', async () => {
            assert.deepEqual(
                await metric('/resources/blog-post/metrics/new-posts'),
                {
                    type: 'value',
                    value: 3,
                    previous: 1,
                    comparedWith: 'the 30 days before',
                },
            );
            assert.deepEqual(
                await metric('/resources/blog-post/metrics/new-posts?range=7'),
                {
                    type: 'value',
                    value: 2,
                    previous: 0,
                    comparedWith: 'the 7 days before',
                },
            );
        });

        it('falls back to the default range for one the metric does not offer', async () => {
            assert.deepEqual(
                await metric('/resources/blog-post/metrics/new-posts?range=12'),
                {
                    type: 'value',
                    value: 3,
                    previous: 1,
                    comparedWith: 'the 30 days before',
                },
            );
        });

        it('sums a column by day, a zero for a day without rows', async () => {
            const result = await metric(
                '/resources/blog-post/metrics/views-per-day?range=7',
            );

            assert.equal(result.type, 'trend');
            assert.ok(result.type === 'trend');
            assert.equal(result.points.length, 7);
            assert.equal(
                result.points.at(-1)?.label,
                new Date().toISOString().slice(0, 10),
            );
            assert.deepEqual(
                result.points.map(({ value }) => value),
                [0, 0, 0, 20, 0, 0, 10],
            );
        });

        it('counts the rows of a calendar year against the one before, and of all time against nothing', async () => {
            await dataSource.query(
                `INSERT INTO "${schema}"."blog_post" (title, "createdAt") VALUES ('A', '2023-12-31T23:00:00Z'), ('B', '2024-03-10T12:00:00Z'), ('C', '2024-11-02T12:00:00Z')`,
            );

            assert.deepEqual(
                await metric('/resources/blog-post/metrics/posts?range=2024'),
                { type: 'value', value: 2, previous: 1, comparedWith: '2023' },
            );
            assert.deepEqual(
                await metric('/resources/blog-post/metrics/posts?range=all'),
                { type: 'value', value: 7, previous: null },
            );
        });

        it('counts the rows a month at a time over a year, and a year at a time since the first', async () => {
            await dataSource.query(
                `INSERT INTO "${schema}"."blog_post" (title, "createdAt") VALUES ('B', '2024-03-10T12:00:00Z'), ('C', '2024-03-31T23:30:00Z'), ('D', '2024-11-02T12:00:00Z')`,
            );

            const year = await metric(
                '/resources/blog-post/metrics/posts-per-month?range=2024',
            );
            const ever = await metric(
                '/resources/blog-post/metrics/posts-per-month?range=all',
            );

            assert.ok(year.type === 'trend' && ever.type === 'trend');
            assert.deepEqual(
                year.points.map(({ label, value }) => `${label}:${value}`),
                [
                    '2024-01:0',
                    '2024-02:0',
                    '2024-03:2',
                    '2024-04:0',
                    '2024-05:0',
                    '2024-06:0',
                    '2024-07:0',
                    '2024-08:0',
                    '2024-09:0',
                    '2024-10:0',
                    '2024-11:1',
                    '2024-12:0',
                ],
            );
            assert.deepEqual(ever.points[0], { label: '2024', value: 3 });
            assert.equal(
                ever.points.at(-1)?.label,
                String(new Date().getUTCFullYear()),
            );
        });

        it('counts the rows of the range by a column, largest first, labelled as they read', async () => {
            await dataSource.query(
                `INSERT INTO "${schema}"."blog_post" (title, status) VALUES ('Extra', 'draft')`,
            );

            assert.deepEqual(
                await metric(
                    '/resources/blog-post/metrics/posts-by-status?range=all',
                ),
                {
                    type: 'partition',
                    slices: [
                        { label: 'Draft', value: 3 },
                        { label: 'Published', value: 2 },
                    ],
                },
            );
            // the last 30 days, the page's default, leave out the draft of 45 days ago
            assert.partialDeepStrictEqual(
                await metric('/resources/blog-post/metrics/posts-by-status'),
                { slices: [{ label: 'Draft', value: 2 }] },
            );
        });

        it('counts every row of an entity that dates none, whatever the range', async () => {
            await call('POST', '/resources/note', { text: 'a' });

            assert.deepEqual(
                await countBy({
                    repository: dataSource.getRepository(NoteEntity),
                    column: 'text',
                    range: 'today',
                }),
                { slices: [{ label: 'A', value: 1 }] },
            );
        });

        const day = (days: number) => ago(days).slice(0, 10);

        it('calculates every dashboard card for its range, one that fails as null', async () => {
            const { body } = await call<DashboardResponse>('GET', '/dashboard');

            assert.deepEqual(body.range, {
                value: '30',
                label: '30 days',
                from: day(29),
                to: day(0),
            });
            assert.deepEqual(body.cards, [
                {
                    name: 'authors',
                    result: {
                        type: 'value',
                        value: 20,
                        previous: 40,
                        comparedWith: 'the 30 days before',
                    },
                },
                {
                    name: 'latest-posts',
                    result: {
                        type: 'table',
                        caption: '2 shown',
                        rows: [
                            {
                                title: 'New',
                                value: 10,
                                link: { resource: 'blog-post', key: 1 },
                            },
                            {
                                title: 'Recent',
                                value: 20,
                                link: { resource: 'blog-post', key: 2 },
                            },
                        ],
                    },
                },
                { name: 'broken', result: null },
            ]);
            assert.deepEqual(
                (
                    await call<AdminSchema>('GET', '/schema')
                ).body.dashboard?.cards.map(({ name }) => name),
                ['authors', 'latest-posts', 'broken'],
            );
        });

        it('takes days picked on a calendar, and its default for days it cannot read', async () => {
            const { body } = await call<DashboardResponse>(
                'GET',
                `/dashboard?range=${day(3)}..${day(1)}`,
            );
            const fallen = await call<DashboardResponse>(
                'GET',
                '/dashboard?range=2026-02-31..2026-03-01',
            );

            assert.deepEqual(body.range, {
                value: `${day(3)}..${day(1)}`,
                label: 'Custom',
                from: day(3),
                to: day(1),
            });
            assert.partialDeepStrictEqual(body.cards[1]?.result, {
                rows: [{ title: 'Recent' }],
            });
            assert.equal(fallen.body.range.value, '30');
        });
    });

    describe('upload', () => {
        const upload = async (bytes: number, type: string, name = 'me.png') => {
            const form = new FormData();
            form.append(
                'file',
                new Blob([Buffer.alloc(bytes)], { type }),
                name,
            );

            const response = await fetch(
                `${base}/resources/author/files/avatar`,
                {
                    method: 'POST',
                    body: form,
                },
            );

            return {
                status: response.status,
                body: (await response.json()) as UploadResponse &
                    ValidationErrorResponse,
            };
        };

        it('stores the file through the field, returning the value to save and where it shows', async () => {
            const { status, body } = await upload(10, 'image/png');

            assert.equal(status, 200);
            assert.deepEqual(body.data, {
                value: 'avatars/me.png',
                url: 'https://cdn.test/avatars/me.png',
                name: 'me.png',
                image: true,
            });

            const author = await call<RecordResponse>(
                'POST',
                '/resources/author',
                {
                    name: 'Ada',
                    email: 'ada@example.test',
                    avatar: body.data.value,
                },
            );

            assert.deepEqual(author.body.data.values.avatar, body.data);
        });

        it('refuses a file of a type or a size the field does not take', async () => {
            const pdf = await upload(10, 'application/pdf', 'cv.pdf');
            const large = await upload(1_001, 'image/png');

            assert.equal(pdf.status, 422);
            assert.deepEqual(pdf.body.errors, {
                avatar: ['Avatar must be image/*'],
            });
            assert.deepEqual(large.body.errors, {
                avatar: ['Avatar must be at most 0 MB'],
            });
        });

        it('says when there is no file, or no such file field', async () => {
            const post = (field: string) =>
                fetch(`${base}/resources/author/files/${field}`, {
                    method: 'POST',
                    body: new FormData(),
                });

            assert.equal((await post('avatar')).status, 400);
            assert.equal((await post('name')).status, 404);
        });
    });

    describe('activity log', () => {
        const history = async (path: string) =>
            (await call<ActivityResponse>('GET', path)).body.data.map(
                ({ event, action, changes, recordTitle }) => ({
                    event,
                    action,
                    changes,
                    recordTitle,
                }),
            );

        it('keeps a create with its values, and an update with only what changed', async () => {
            await createPost({ title: 'Hello', views: 1 });
            await call('PATCH', '/resources/blog-post/1', {
                title: 'Renamed',
                views: 1,
            });

            const [updated, created] = await history(
                '/resources/blog-post/1/activity',
            );

            assert.deepEqual(updated, {
                event: 'updated',
                action: null,
                changes: { title: { from: 'Hello', to: 'Renamed' } },
                recordTitle: 'Renamed',
            });
            assert.equal(created?.event, 'created');
            assert.partialDeepStrictEqual(created?.changes, {
                title: 'Hello',
                views: 1,
                status: 'draft',
            });
        });

        it('keeps no update that changed nothing', async () => {
            await createPost({ title: 'Hello' });
            await call('PATCH', '/resources/blog-post/1', { title: 'Hello' });

            assert.deepEqual(
                (await history('/resources/blog-post/1/activity')).map(
                    ({ event }) => event,
                ),
                ['created'],
            );
        });

        it('names a password written, never what it was', async () => {
            await call('POST', '/resources/author', {
                name: 'Ada',
                email: 'ada@example.test',
                passwordHash: 'secret-hash',
            });

            const [created] = await history('/resources/author/1/activity');

            assert.equal(created?.changes.passwordHash, '(changed)');
            assert.ok(!JSON.stringify(created).includes('secret-hash'));
        });

        it('keeps deletes, attaches, detaches and actions, with what they touched', async () => {
            const tag = randomUUID();
            await call('POST', '/resources/tag', { id: tag, label: 'news' });
            await createPost({ title: 'Hello' });
            await call('POST', '/resources/blog-post/1/relations/tags/attach', {
                keys: [tag],
            });
            await call('POST', '/resources/blog-post/1/relations/tags/detach', {
                keys: [tag],
            });
            await call('POST', '/resources/blog-post/actions/publish', {
                keys: [1],
                values: { bonusViews: 2 },
            });
            await call('DELETE', '/resources/blog-post', { keys: [1] });

            const events = await history('/resources/blog-post/1/activity');

            assert.deepEqual(
                events.map(({ event, action }) => [event, action]),
                [
                    ['deleted', null],
                    ['action', 'publish'],
                    ['detached', null],
                    ['attached', null],
                    ['created', null],
                ],
            );
            assert.deepEqual(events[2]?.changes, { tags: ['news'] });
            assert.deepEqual(events[1]?.changes, { bonusViews: 2 });
            assert.partialDeepStrictEqual(events[0]?.changes, {
                title: 'Hello',
                status: 'published',
            });
        });

        it('lists everything, newest first, or one resource', async () => {
            await createPost({ title: 'Hello' });
            await call('POST', '/resources/author', {
                name: 'Ada',
                email: 'ada@example.test',
            });

            const all = (await call<ActivityResponse>('GET', '/activity')).body;
            const posts = (
                await call<ActivityResponse>(
                    'GET',
                    '/activity?resource=blog-post',
                )
            ).body;

            assert.deepEqual(
                all.data.map(({ resource, recordTitle }) => [
                    resource,
                    recordTitle,
                ]),
                [
                    ['author', 'Ada'],
                    ['blog-post', 'Hello'],
                ],
            );
            assert.deepEqual(
                posts.data.map(({ recordKey }) => recordKey),
                ['1'],
            );
            assert.deepEqual(all.meta, { page: 1, hasMore: false });
        });
    });

    describe('soft deletes', () => {
        const notes = async (query = '') =>
            (
                await call<ListResponse>('GET', `/resources/note${query}`)
            ).body.data.map(({ title }) => title);

        beforeEach(async () => {
            for (const text of ['Keep', 'Bin'])
                await call('POST', '/resources/note', { text });
            await call('DELETE', '/resources/note', { keys: [2] });
        });

        it('only marks a record deleted, which lists then leave out unless asked', async () => {
            assert.deepEqual(await notes(), ['Keep']);
            assert.deepEqual(await notes('?trashed=with&sort=text'), [
                'Bin',
                'Keep',
            ]);
            assert.deepEqual(await notes('?trashed=only'), ['Bin']);

            const { status, body } = await call<RecordResponse>(
                'GET',
                '/resources/note/2',
            );

            assert.equal(status, 200);
            assert.ok(body.data.values.deletedAt);
        });

        it('restores a deleted record', async () => {
            const { body } = await call('POST', '/resources/note/restore', {
                keys: [2],
            });

            assert.deepEqual(body, { restored: 1 });
            assert.deepEqual(await notes('?sort=text'), ['Bin', 'Keep']);

            // Keep was never deleted, so restoring it does nothing, and logs nothing
            const again = await call('POST', '/resources/note/restore', {
                keys: [1],
            });

            assert.equal(again.status, 200);
            assert.deepEqual(again.body, { restored: 0 });

            assert.deepEqual(
                (
                    await call<ActivityResponse>(
                        'GET',
                        '/resources/note/1/activity',
                    )
                ).body.data.map(({ event }) => event),
                ['created'],
            );
        });

        it('removes a record for good when forced, keeping each step in the log', async () => {
            await call('DELETE', '/resources/note', { keys: [2], force: true });

            assert.equal((await call('GET', '/resources/note/2')).status, 404);
            assert.deepEqual(
                (
                    await call<ActivityResponse>(
                        'GET',
                        '/resources/note/2/activity',
                    )
                ).body.data.map(({ event }) => event),
                ['forceDeleted', 'deleted', 'created'],
            );
        });

        it('restores through a resource that does not list deletedAt', async () => {
            const { body } = await call(
                'POST',
                '/resources/bare-note/restore',
                {
                    keys: [2],
                },
            );

            assert.deepEqual(body, { restored: 1 });
        });

        it("deletes through a resource's own delete(), given the entities", async () => {
            const { body } = await call('DELETE', '/resources/bare-note', {
                keys: [1],
            });

            assert.deepEqual(body, { deleted: 1 });
            assert.deepEqual(await notes('?trashed=only&sort=text'), [
                'Bin',
                'Keep',
            ]);
        });

        it('names a password an action asks for in the log, but never keeps it', async () => {
            await call('POST', '/resources/note/actions/lock', {
                keys: [1],
                values: { pin: 'secret' },
            });

            const { body } = await call<ActivityResponse>(
                'GET',
                '/resources/note/1/activity',
            );

            assert.deepEqual(body.data[0]?.changes, { pin: '(changed)' });
        });

        it('refuses to restore records of a resource that deletes for good', async () => {
            await createPost({ title: 'Hello' });

            assert.equal(
                (
                    await call('POST', '/resources/blog-post/restore', {
                        keys: [1],
                    })
                ).status,
                400,
            );
        });
    });

    describe('phase 5', () => {
        it('sorts by a belongsTo, by the title of the record it points at', async () => {
            for (const name of ['Zoe', 'Ada', 'Mia'])
                await call('POST', '/resources/author', {
                    name,
                    email: `${name}@example.test`,
                });
            for (const [title, author] of [
                ['First', 1],
                ['Second', 2],
                ['Third', 3],
            ] as const)
                await createPost({ title, author });

            const titles = async (direction: string) =>
                (
                    await call<ListResponse>(
                        'GET',
                        `/resources/blog-post?sort=author&direction=${direction}`,
                    )
                ).body.data.map(
                    ({ values }) => (values.author as { title: string }).title,
                );

            assert.deepEqual(await titles('asc'), ['Ada', 'Mia', 'Zoe']);
            assert.deepEqual(await titles('desc'), ['Zoe', 'Mia', 'Ada']);
        });

        it('runs a standalone action on no records, returning the file it made', async () => {
            await createPost({ title: 'One' });
            await createPost({ title: 'Two' });

            const { status, body } = await call<ActionResponse>(
                'POST',
                '/resources/blog-post/actions/report',
                {
                    keys: [],
                },
            );
            const schema = (
                await call<AdminSchema>('GET', '/schema')
            ).body.resources.find(({ name }) => name === 'blog-post');

            assert.equal(status, 200);
            assert.equal(body.message, 'Report ready');
            assert.deepEqual(body.download, {
                filename: 'report.txt',
                contentType: 'text/plain',
                base64: Buffer.from('2 posts').toString('base64'),
            });
            assert.partialDeepStrictEqual(
                schema?.actions.find(({ name }) => name === 'report'),
                { standalone: true, showOnDetail: false },
            );
            assert.deepEqual(
                (await call<ActivityResponse>('GET', '/activity')).body.data[0]
                    ?.recordTitle,
                'Report',
            );
        });

        it('searches every resource by title, a few records each', async () => {
            await call('POST', '/resources/author', {
                name: 'Ada Lovelace',
                email: 'ada@example.test',
            });
            await createPost({ title: 'Ada writes' });
            await createPost({ title: 'Nothing here' });

            const { body } = await call<SearchResponse>('GET', '/search?q=ada');

            assert.deepEqual(
                body.data.map(({ resource, records }) => [
                    resource,
                    records.map(({ title }) => title),
                ]),
                [
                    ['blog-post', ['Ada writes']],
                    ['author', ['Ada Lovelace']],
                ],
            );
            assert.deepEqual(
                (await call<SearchResponse>('GET', '/search?q=')).body,
                { data: [] },
            );
        });
    });
});
