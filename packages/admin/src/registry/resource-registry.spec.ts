import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import type { ExecutionContext, Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type FindOperator } from 'typeorm';
import { Action } from '../actions/action.js';
import { AdminActivityEntity } from '../activity/activity.entity.js';
import { ActivityLog } from '../activity/activity-log.js';
import { AdminService } from '../admin.service.js';
import { AdminGuard } from '../auth/admin.guard.js';
import {
    BelongsTo,
    BelongsToMany,
    BooleanField,
    DateField,
    DateTime,
    Email,
    Field,
    FileField,
    HasMany,
    ID,
    Json,
    NumberField,
    Password,
    Select,
    Text,
    Textarea,
} from '../fields/field.js';
import {
    type AnyFilter,
    BooleanFilter,
    DateFilter,
    Filter,
} from '../filters/filter.js';
import { Dashboard, Partition, Trend, Value } from '../metrics/metric.js';
import { Resource } from '../resources/resource.js';
import {
    AuthorEntity,
    CommentEntity,
    ENTITIES,
    PostEntity,
    PostStatus,
    TagEntity,
} from '../testing/entities.js';
import type { RangeOption } from '../types/types.js';
import { ResourceRegistry } from './resource-registry.js';

// built from the entities alone, without connecting
const dataSource = new DataSource({ type: 'postgres', entities: ENTITIES });

/** The schema the panel gets with these resources provided. */
const boot = async (...resources: Type[]) => {
    const module = await Test.createTestingModule({
        imports: [DiscoveryModule],
        providers: [
            ResourceRegistry,
            AdminService,
            ActivityLog,
            ...resources,
            { provide: getDataSourceToken(), useValue: dataSource },
            {
                provide: getRepositoryToken(AdminActivityEntity),
                useValue: dataSource.getRepository(AdminActivityEntity),
            },
        ],
    }).compile();

    await module.init();

    return module.get(AdminService).schema();
};

const resourceOf = async (resource: Type) => {
    const [schema] = (await boot(resource)).resources;
    assert.ok(schema);

    return schema;
};

/** The posts' plain fields, which the resources below build on. */
class Posts extends Resource<PostEntity> {
    entity = PostEntity;

    override fields() {
        return [
            ID.make(),
            Text.make('title').sortable().required(),
            Textarea.make('body').nullable(),
            Select.make('status').options([
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
            ]),
            NumberField.make('views'),
            BooleanField.make('featured'),
            DateField.make('publishOn').nullable(),
            DateTime.make('publishedAt').nullable(),
            Json.make('meta'),
            Text.make('externalId', 'External ID').nullable(),
            DateTime.make('createdAt').exceptOnForms(),
        ];
    }
}

class PostResource extends Posts {}

class RelatedPostResource extends Resource<PostEntity> {
    entity = PostEntity;

    override fields() {
        return [
            ID.make(),
            Text.make('title'),
            BelongsTo.make('author').nullable().sortable(),
            BelongsToMany.make('tags'),
        ];
    }
}

class TagResource extends Resource<TagEntity> {
    entity = TagEntity;

    override fields() {
        return [
            ID.make().showOnCreating().required(),
            Text.make('label'),
            BelongsToMany.make('posts'),
        ];
    }
}

class AuthorResource extends Resource<AuthorEntity> {
    entity = AuthorEntity;

    override fields() {
        return [ID.make(), Text.make('name'), HasMany.make('posts')];
    }
}

/** The schema of each resource, by name, with every one of these provided. */
const resourcesOf = async (...resources: Type[]) =>
    Object.fromEntries(
        (await boot(...resources)).resources.map((schema) => [
            schema.name,
            schema,
        ]),
    );

const fieldOf = async (resource: string, field: string, ...resources: Type[]) =>
    (await resourcesOf(...resources))[resource]?.fields.find(
        ({ name }) => name === field,
    );

before(async () => {
    await (
        dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
});

describe('ResourceRegistry resources', () => {
    it("names a resource after its table, labels it by its entity's class, and titles records by their title", async () => {
        assert.partialDeepStrictEqual(await resourceOf(PostResource), {
            name: 'blog-post',
            label: 'Posts',
            singularLabel: 'Post',
            titleField: 'title',
            perPage: 25,
            perPageOptions: [10, 25, 50, 100],
            defaultSort: { field: 'id', direction: 'desc' },
        });
    });

    it('searches its text fields, and sorts by the primary key when no field is it', async () => {
        class Labels extends Resource<TagEntity> {
            entity = TagEntity;

            override fields() {
                return [Text.make('label')];
            }
        }

        assert.equal((await resourceOf(PostResource)).searchable, true);
        assert.partialDeepStrictEqual(await resourceOf(Labels), {
            titleField: 'label',
            searchable: true,
            defaultSort: { field: 'id', direction: 'desc' },
        });
    });
});

describe('ResourceRegistry field types', () => {
    it("takes only its entity's properties through this.make, any name for a computed field", () => {
        class Typed extends Resource<TagEntity> {
            entity = TagEntity;

            override fields() {
                return [
                    this.make(ID),
                    this.make(Text, 'label').sortable(),
                    this.make(Text, 'color', 'Colour'),
                    this.make(BelongsToMany, 'posts'),
                    this.make(Text, 'shout', (tag) => String(tag)),
                    // @ts-expect-error: the tag has no "lable"
                    this.make(Text, 'lable'),
                ];
            }
        }

        // the check is the compiler's; at run time the fields are made as told
        assert.deepEqual(
            new Typed().fields().map(({ name }) => name),
            ['id', 'label', 'color', 'posts', 'shout', 'lable'],
        );
        assert.equal(new Typed().fields()[2]?.toSchema().label, 'Colour');
    });
});

describe('ResourceRegistry overrides', () => {
    it('takes the fields, labels and paging a resource declares', async () => {
        class AuthorResource extends Resource<AuthorEntity> {
            entity = AuthorEntity;

            override uriKey = 'writers';
            override label = 'Writers';
            override singularLabel = 'Writer';
            override title = 'email';
            override search = ['name'];
            override perPage = 10;
            override perPageOptions = [10, 20];
            override defaultSort = { field: 'name', direction: 'asc' as const };

            override fields() {
                return [
                    ID.make(),
                    Text.make('name').sortable(),
                    Email.make('email'),
                    Password.make('passwordHash', 'Password'),
                    Text.make('initials', () => 'AL'),
                ];
            }
        }

        assert.partialDeepStrictEqual(await resourceOf(AuthorResource), {
            name: 'writers',
            label: 'Writers',
            singularLabel: 'Writer',
            titleField: 'email',
            perPage: 10,
            defaultSort: { field: 'name', direction: 'asc' },
            fields: [
                { name: 'id' },
                { name: 'name' },
                { name: 'email' },
                { name: 'passwordHash', type: 'password' },
                { name: 'initials', readonly: true },
            ],
        });
    });
});

describe('ResourceRegistry refuses at boot', () => {
    const refuses = async (resource: Type, message: RegExp) =>
        assert.rejects(boot(resource), message);

    // untyped, so the compiler lets through the names boot has to refuse
    const tagsWith = (...fields: Field[]) => {
        class R extends Resource {
            entity = TagEntity;

            override fields() {
                return fields;
            }
        }

        return R;
    };

    it('a field that is no column and computes nothing', async () => {
        await refuses(
            tagsWith(ID.make(), Text.make('slug')),
            /field "slug" that is no column; give make\(\) a function to compute it/,
        );
    });

    it('two fields of the same name', async () => {
        await refuses(
            tagsWith(ID.make(), Text.make('label'), Text.make('label')),
            /two fields named "label"/,
        );
    });

    it('a custom field without its component', async () => {
        class Color extends Field {
            readonly type = 'custom';
        }

        await refuses(
            tagsWith(Color.make('color')),
            /"color" that is custom, without the component/,
        );
    });

    it('a search through a column that is not text', async () => {
        class R extends Posts {
            entity = PostEntity;

            override search = ['views'];
        }

        await refuses(R, /searches "views", which is no text field/);
    });

    it('a default sort by a field that cannot be sorted', async () => {
        class R extends Posts {
            entity = PostEntity;

            override defaultSort = { field: 'meta', direction: 'asc' as const };
        }

        await refuses(R, /sorts by "meta", which is no sortable field/);
    });

    it('a page size outside its own options', async () => {
        class R extends Posts {
            entity = PostEntity;

            override perPage = 30;
        }

        await refuses(R, /shows 30 a page/);
    });

    it('an entity TypeORM does not know', async () => {
        class Ghost {}

        class R extends Resource {
            entity = Ghost;

            override fields() {
                return [];
            }
        }

        await refuses(R, /shows Ghost, which is no entity TypeORM knows/);
    });

    it('a uriKey no url takes', async () => {
        class R extends Posts {
            override uriKey = 'Blog Posts';
        }

        await refuses(R, /The R admin resource is named "Blog Posts"/);
    });

    it('two resources of the same name', async () => {
        class Twin extends Resource<TagEntity> {
            entity = TagEntity;

            override uriKey = 'blog-post';

            override fields() {
                return [ID.make()];
            }
        }

        await assert.rejects(
            boot(PostResource, Twin),
            /PostResource and Twin are admin resources named "blog-post": give one a uriKey of its own/,
        );
    });
});

describe('AdminGuard', () => {
    it('lets no request in without an AdminAuthenticator', async () => {
        const guard = new AdminGuard({
            authenticator: () => null,
        } as unknown as ResourceRegistry);

        await assert.rejects(
            guard.canActivate({} as ExecutionContext),
            /no provider extends AdminAuthenticator/,
        );
    });
});

describe('ResourceRegistry relations', () => {
    it('shows a foreign key declared beside its relation as a field of its own', async () => {
        class Comments extends Resource<CommentEntity> {
            entity = CommentEntity;

            override fields() {
                return [
                    ID.make(),
                    NumberField.make('postId'),
                    BelongsTo.make('post'),
                ];
            }
        }

        const { resources } = await boot(Comments, PostResource);

        assert.partialDeepStrictEqual(
            resources[0]?.fields.find(({ name }) => name === 'postId'),
            { type: 'number', required: true },
        );
    });

    it('shows a hasMany and a belongsToMany on the detail page only', async () => {
        const resources = await resourcesOf(
            RelatedPostResource,
            AuthorResource,
            TagResource,
        );
        const relations = (name: string) =>
            resources[name]?.fields
                .filter(({ relation }) => relation)
                .map(({ name, type, relation, visibility }) => [
                    name,
                    type,
                    relation?.resource,
                    visibility.index,
                ]);

        assert.deepEqual(relations('author'), [
            ['posts', 'hasMany', 'blog-post', false],
        ]);
        assert.deepEqual(relations('tag'), [
            ['posts', 'belongsToMany', 'blog-post', false],
        ]);
        assert.deepEqual(relations('blog-post'), [
            ['author', 'belongsTo', 'author', true],
            ['tags', 'belongsToMany', 'tag', false],
        ]);
    });

    it('lists the records of a relation by the resource it names', async () => {
        class WriterResource extends Resource<AuthorEntity> {
            entity = AuthorEntity;

            override uriKey = 'writers';

            override fields() {
                return [ID.make(), Text.make('name')];
            }
        }

        class R extends Resource<PostEntity> {
            entity = PostEntity;

            override fields() {
                return [
                    ID.make(),
                    BelongsTo.make('author', 'Author', WriterResource),
                ];
            }
        }

        const author = await fieldOf(
            'blog-post',
            'author',
            R,
            AuthorResource,
            WriterResource,
        );

        assert.deepEqual(author?.relation, { resource: 'writers' });
    });

    it('refuses a relation field it cannot show', async () => {
        const declaring = (field: Field) => {
            class R extends Resource {
                entity = PostEntity;

                override fields() {
                    return [ID.make(), field];
                }
            }

            return R;
        };

        await assert.rejects(
            boot(declaring(BelongsTo.make('author'))),
            /"author" that relates to AuthorEntity, which has no admin resource/,
        );
        await assert.rejects(
            boot(declaring(BelongsTo.make('title'))),
            /"title" that is no relation/,
        );
        await assert.rejects(
            boot(declaring(HasMany.make('author')), AuthorResource),
            /"author" that is no hasMany relation/,
        );
        await assert.rejects(
            boot(declaring(BelongsTo.make('author', 'Author', AuthorResource))),
            /lists its records by AuthorResource, which is no admin resource/,
        );
        await assert.rejects(
            boot(
                declaring(BelongsTo.make('author', 'Author', TagResource)),
                TagResource,
            ),
            /lists its records by TagResource, which is no resource of AuthorEntity/,
        );
    });
});

describe('ResourceRegistry filters', () => {
    class StatusFilter extends Filter<PostEntity> {
        override options() {
            return [
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
            ];
        }

        override apply({ value }: { value: string | number }) {
            return { status: value as PostStatus };
        }
    }

    class FeaturedFilter extends BooleanFilter<PostEntity> {
        override label = 'Featured only';

        override apply({ value }: { value: boolean }) {
            return { featured: value };
        }
    }

    class CreatedFilter extends DateFilter<PostEntity> {
        override name = 'created';

        override apply({ value }: { value: FindOperator<never> }) {
            return { createdAt: value };
        }
    }

    class EmptyFilter extends Filter<PostEntity> {
        override options() {
            return [];
        }

        override apply() {
            return {};
        }
    }

    const declaring = (...filters: AnyFilter<PostEntity>[]) => {
        class R extends Posts {
            entity = PostEntity;

            override filters() {
                return filters;
            }
        }

        return R;
    };

    it('names a filter after its class, and describes the ones it declares', async () => {
        assert.deepEqual(
            (
                await resourceOf(
                    declaring(
                        new StatusFilter(),
                        new FeaturedFilter(),
                        new CreatedFilter(),
                    ),
                )
            ).filters,
            [
                {
                    name: 'status',
                    label: 'Status',
                    type: 'select',
                    options: [
                        { value: 'draft', label: 'Draft' },
                        { value: 'published', label: 'Published' },
                    ],
                },
                { name: 'featured', label: 'Featured only', type: 'boolean' },
                { name: 'created', label: 'Created', type: 'dateRange' },
            ],
        );
    });

    it('refuses a select filter without options, and two of the same name', async () => {
        await assert.rejects(
            boot(declaring(new EmptyFilter())),
            /select filter "empty" without options/,
        );
        await assert.rejects(
            boot(declaring(new FeaturedFilter(), new FeaturedFilter())),
            /two filters named "featured"/,
        );
    });
});

describe('ResourceRegistry actions', () => {
    class PublishPostsAction extends Action<PostEntity> {
        override destructive = true;
        override confirmText = 'Publish them?';
        override showOnDetail = false;

        override fields() {
            return [DateTime.make('at').required()];
        }

        override async handle() {
            return undefined;
        }
    }

    const offering = (...actions: Action<PostEntity>[]) => {
        class R extends Posts {
            entity = PostEntity;

            override actions() {
                return actions;
            }
        }

        return R;
    };

    it('names an action after its class, and describes it with its fields', async () => {
        const [action] = (await resourceOf(offering(new PublishPostsAction())))
            .actions;

        assert.partialDeepStrictEqual(action, {
            name: 'publish-posts',
            label: 'Publish posts',
            destructive: true,
            confirmText: 'Publish them?',
            showOnIndex: true,
            showOnDetail: false,
            fields: [{ name: 'at', type: 'datetime', required: true }],
        });
    });

    it('refuses two actions of the same name, and one asking for a relation', async () => {
        class AskingAction extends Action<PostEntity> {
            override fields() {
                return [BelongsTo.make('author')];
            }

            override async handle() {
                return undefined;
            }
        }

        await assert.rejects(
            boot(offering(new PublishPostsAction(), new PublishPostsAction())),
            /two actions named "publish-posts"/,
        );
        await assert.rejects(
            boot(offering(new AskingAction())),
            /asks for "author", which can only be a plain value/,
        );

        class PickingAction extends Action<PostEntity> {
            override fields() {
                return [Select.make('status')];
            }

            override async handle() {
                return undefined;
            }
        }

        await assert.rejects(
            boot(offering(new PickingAction())),
            /has a field "status" that is a select without options/,
        );
    });
});

describe('ResourceRegistry cards', () => {
    class NewPostsMetric extends Value<PostEntity> {
        override prefix = '+';

        override async calculate() {
            return { value: 1, previous: null };
        }
    }

    class PostsByStatusMetric extends Partition<PostEntity> {
        override async calculate() {
            return { slices: [] };
        }
    }

    it("describes a resource's cards", async () => {
        class R extends Posts {
            override cards() {
                return [new NewPostsMetric(), new PostsByStatusMetric()];
            }
        }

        assert.deepEqual((await resourceOf(R)).metrics, [
            {
                name: 'new-posts',
                label: 'New posts',
                type: 'value',
                width: '1/4',
                prefix: '+',
            },
            {
                name: 'posts-by-status',
                label: 'Posts by status',
                type: 'partition',
                width: '1/2',
                chart: 'pie',
            },
        ]);
    });

    it("names a built-in card by what it counts: the resource's rows, or its own entity's", async () => {
        class R extends Posts {
            override cards() {
                return [
                    new Value(),
                    new Trend({ chart: 'line', width: 'full' }),
                    new Partition({ column: 'status' }),
                    new Value({ entity: TagEntity, label: 'Tags in use' }),
                    new Value({
                        label: "Today's views (€)",
                        fn: 'sum',
                        of: 'views',
                    }),
                ];
            }
        }

        assert.deepEqual(
            (await resourceOf(R)).metrics.map(
                ({ name, label, width, chart }) => ({
                    name,
                    label,
                    width,
                    ...(chart && { chart }),
                }),
            ),
            [
                { name: 'posts-value', label: 'Posts', width: '1/4' },
                {
                    name: 'posts-trend',
                    label: 'Posts',
                    width: 'full',
                    chart: 'line',
                },
                {
                    name: 'posts-by-status-partition',
                    label: 'Posts by status',
                    width: '1/2',
                    chart: 'pie',
                },
                {
                    name: 'tags-in-use',
                    label: 'Tags in use',
                    width: '1/4',
                },
                {
                    name: 'todays-views',
                    label: "Today's views (€)",
                    width: '1/4',
                },
            ],
        );
    });

    it('refuses a partition without a column to group by, also a subclass that counts as Partition does', async () => {
        class Shares extends Partition {}

        for (const card of [new Partition(), new Shares()]) {
            class R extends Posts {
                override cards() {
                    return [card];
                }
            }

            await assert.rejects(
                boot(R),
                /groups by no column: give it a column/,
            );
        }
    });

    it('labels named periods and years, and defaults to this month', async () => {
        class R extends Posts {
            override ranges: RangeOption[] = [
                'today',
                'week',
                'month',
                'year',
                '2025',
                { value: 'all', label: 'Since ever' },
            ];
        }

        const { ranges, defaultRange } = await resourceOf(R);

        assert.deepEqual(ranges, [
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This week' },
            { value: 'month', label: 'This month' },
            { value: 'year', label: 'This year' },
            { value: '2025', label: '2025' },
            { value: 'all', label: 'Since ever' },
        ]);
        assert.equal(defaultRange, 'month');
    });

    it('defaults to the range it names, else 30 days, else the first', async () => {
        const ranged = (ranges: RangeOption[], defaultRange?: string) => {
            class R extends Posts {
                override ranges = ranges;
                override defaultRange = defaultRange;
            }

            return resourceOf(R);
        };

        assert.equal(
            (await ranged(['today', 'year'], 'year')).defaultRange,
            'year',
        );
        assert.equal((await ranged([7, 30, 90])).defaultRange, '30');
        assert.equal((await ranged([7, 90])).defaultRange, '7');
    });

    it('refuses a range it cannot read, and one offered twice', async () => {
        const offering = (...ranges: RangeOption[]) => {
            class R extends Posts {
                override ranges = ranges;
            }

            return R;
        };

        await assert.rejects(
            boot(offering('soon' as RangeOption)),
            /range "soon" it cannot date/,
        );
        await assert.rejects(boot(offering(0)), /range "0" it cannot date/);
        await assert.rejects(
            boot(offering(30, { value: 30, label: 'A month' })),
            /offers two ranges named "30"/,
        );
    });

    it('describes the dashboard: its cards, and the ranges of its picker', async () => {
        class Main extends Dashboard {
            override cards() {
                return [new NewPostsMetric()];
            }
        }

        assert.partialDeepStrictEqual((await boot(Main)).dashboard, {
            label: 'Dashboard',
            ranges: [
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This week' },
                { value: 'month', label: 'This month' },
                { value: 'year', label: 'This year' },
                { value: 'all', label: 'All time' },
            ],
            defaultRange: 'month',
            cards: [{ name: 'new-posts', width: '1/4' }],
        });
        assert.equal((await boot(PostResource)).dashboard, null);
    });

    it('refuses a second dashboard, a default it does not offer, and a range it cannot date', async () => {
        const dashboard = (ranges: RangeOption[], defaultRange?: string) => {
            class Main extends Dashboard {
                override ranges = ranges;
                override defaultRange = defaultRange;

                override cards() {
                    return [];
                }
            }

            return Main;
        };

        await assert.rejects(
            boot(dashboard(['month']), dashboard(['year'])),
            /Main and Main extend Dashboard: the panel has one dashboard/,
        );
        await assert.rejects(
            boot(dashboard(['today', 'year'], 'month')),
            /defaults to the range "month", which it does not offer/,
        );
        await assert.rejects(
            boot(dashboard([{ value: 'q1', label: 'Q1' }])),
            /has a range "q1" it cannot date/,
        );
    });

    it('refuses two cards of the same name, and a built-in card on the dashboard without an entity', async () => {
        class Twice extends Dashboard {
            override cards() {
                return [new NewPostsMetric(), new NewPostsMetric()];
            }
        }

        class Unknown extends Dashboard {
            override cards() {
                return [new Value()];
            }
        }

        await assert.rejects(boot(Twice), /two cards named "new-posts"/);
        await assert.rejects(
            boot(Unknown),
            /counts no entity's rows: give it an entity/,
        );
    });
});

describe('ResourceRegistry file fields', () => {
    it('refuses a file field with nowhere to store its files', async () => {
        class R extends Resource<TagEntity> {
            entity = TagEntity;

            override fields() {
                return [ID.make(), FileField.make('label')];
            }
        }

        await assert.rejects(
            boot(R),
            /"label" that is a file field with nowhere to store files; give it store\(\)/,
        );
    });
});

describe('ResourceRegistry activity log', () => {
    it('refuses to boot a resource that keeps a log without the entity it is kept in', async () => {
        const bare = new DataSource({
            type: 'postgres',
            entities: [PostEntity, AuthorEntity, TagEntity],
        });
        await (
            bare as unknown as { buildMetadatas(): Promise<void> }
        ).buildMetadatas();

        const module = await Test.createTestingModule({
            imports: [DiscoveryModule],
            providers: [
                ResourceRegistry,
                PostResource,
                { provide: getDataSourceToken(), useValue: bare },
            ],
        }).compile();

        await assert.rejects(
            module.init(),
            /has no AdminActivityEntity: set autoLoadEntities/,
        );
    });
});

describe('ResourceRegistry column defaults', () => {
    class Bare extends Resource<PostEntity> {
        entity = PostEntity;

        override fields() {
            return [
                this.make(ID),
                this.make(Text, 'title'),
                this.make(Textarea, 'body').exceptOnForms(),
                this.make(Select, 'status').filterable(),
                this.make(BooleanField, 'featured').filterable(),
                this.make(DateTime, 'createdAt').filterable(),
                this.make(BelongsTo, 'author'),
            ];
        }
    }

    it("takes from the column what the field leaves unset: required, nullable, a length, an enum's options, off the forms", async () => {
        const [bare] = (await boot(Bare, AuthorResource)).resources;
        const fields = Object.fromEntries(
            (bare?.fields ?? []).map((field) => [field.name, field]),
        );

        assert.partialDeepStrictEqual(fields, {
            id: { visibility: { create: false, update: false } },
            title: {
                required: true,
                nullable: false,
                constraints: { maxLength: 200 },
            },
            // exceptOnForms shows it on the index too, as in Nova
            body: {
                required: false,
                nullable: true,
                visibility: { index: true, detail: true, create: false },
            },
            status: {
                required: false,
                options: [
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                ],
            },
            createdAt: {
                required: false,
                visibility: { create: false, update: false },
            },
            author: { required: false, nullable: true },
        });
    });

    it('keeps what the field sets over what the column says', async () => {
        class Overridden extends Resource<PostEntity> {
            entity = PostEntity;

            override fields() {
                return [
                    this.make(Text, 'title')
                        .required(false)
                        .constraints({ maxLength: 50 }),
                    this.make(DateTime, 'createdAt').showOnCreating(),
                    this.make(Select, 'status').options(['draft']),
                ];
            }
        }

        assert.partialDeepStrictEqual((await resourceOf(Overridden)).fields, [
            { required: false, constraints: { maxLength: 50 } },
            { visibility: { create: true, update: false } },
            { options: [{ value: 'draft', label: 'Draft' }] },
        ]);
    });

    it('filters by a filterable field, after the filters of its own', async () => {
        const [bare] = (await boot(Bare, AuthorResource)).resources;

        assert.deepEqual(bare?.filters, [
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                options: [
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                ],
            },
            { name: 'featured', label: 'Featured', type: 'boolean' },
            { name: 'created-at', label: 'Created at', type: 'dateRange' },
        ]);
    });

    it('labels the options of an enum by its keys', () => {
        enum Size {
            ExtraLarge = 'xl',
            Small = 's',
        }

        assert.deepEqual(Select.make('size').options(Size).toSchema().options, [
            { value: 'xl', label: 'Extra large' },
            { value: 's', label: 'Small' },
        ]);
    });

    it('refuses sorting by a computed field, filtering a text one, and a name no url takes', async () => {
        class Computed extends Resource<PostEntity> {
            entity = PostEntity;

            override fields() {
                return [this.make(Text, 'shout', () => 'hey').sortable()];
            }
        }

        class TextFilter extends Resource<PostEntity> {
            entity = PostEntity;

            override fields() {
                return [this.make(Text, 'title').filterable()];
            }
        }

        class Spaced extends Resource<PostEntity> {
            entity = PostEntity;

            override fields() {
                return [this.make(ID)];
            }

            override cards() {
                return [new Value({ name: 'Sign ups' })];
            }
        }

        await assert.rejects(
            boot(Computed),
            /"shout" that is computed, so it cannot sort/,
        );
        await assert.rejects(
            boot(TextFilter),
            /filters by "title", where only a select, boolean or date column can/,
        );
        await assert.rejects(
            boot(Spaced),
            /is named "Sign ups", where a name is lowercase/,
        );
    });
});
