# @repo/admin

An admin panel in the style of Laravel Nova, in three parts:

- **`@repo/admin`** (this package): a NestJS module that serves an admin API for the resources you declare.
- **`@repo/admin-contract`**: the types the API and the panel share. Types only.
- **`@repo/admin-ui`**: the panel, a React app built ahead of time, which builds every page from the API's schema. It knows nothing about your entities.

This package serves the built panel at `/admin` and its API at `/admin/api`, so an app ships no admin frontend of its own.

## Setup

**API**

```ts
import { AdminModule } from '@repo/admin';

@Module({
    imports: [
        // autoLoadEntities picks up AdminActivityEntity, the activity log's table;
        // a data source that lists its entities, as the migrations one, lists ADMIN_ENTITIES
        TypeOrmModule.forRoot({ /* ... */ autoLoadEntities: true }),
        AdminModule,
    ],
    providers: [PostResource, MainDashboard, AdminLogin],
})
export class AppModule {}
```

There are no decorators to add and nothing to register: the engine finds every provider that extends `Resource`, `Dashboard` or `AdminAuthenticator`, in whatever module provides it.

The endpoints are served under `/admin/api`, and only to the requests the app's `AdminAuthenticator` authorizes: without one, to no one. An app with a global guard leaves it in front of them, and marks `AdminUiController`, which serves the pages and the sign-in, public: `Public()(AdminUiController)`, as `apps/api/src/admin/admin-panel.module.ts` does.

**Sign-in**

The panel signs in with the app's own login: one provider extends `AdminAuthenticator`.

- `login({ email, password })` resolves with `{ token }`, or null when they are wrong. The panel then sends that token as a Bearer with every request.
- `authorize({ request })` says whether a request may use the API, from what the app's guard left on it, e.g. that its user is an admin. Required, so no app opens the API by forgetting it.
- `actor({ request })`, null unless overridden, names who made each change the activity log keeps.
- `logout({ request })`, nothing unless overridden, ends the session when the panel signs out (`DELETE /admin/api/session`), so a copied token stops working too.

The package doesn't rate-limit `POST /admin/api/session`: in production, limit it at the edge (nginx or the load balancer), as the app's own login, so no one can guess passwords at will.

```ts
@Injectable()
export class AdminLogin extends AdminAuthenticator {
    constructor(private readonly auth: AuthService) {
        super();
    }

    async login(input: SessionInput) {
        const session = await this.auth.login(input);

        return session && { token: session.token };
    }

    async authorize({ request }: { request: object }) {
        return (request as AuthRequest).user?.isAdmin === true;
    }
}
```

**Working on the panel**

```bash
pnpm --filter @repo/admin-ui dev
```

Vite on port 3100 serves it at `/admin/`, sending `/admin/api` to `API_URL` (default `http://localhost:3001`). `pnpm --filter @repo/admin-ui build` builds what the API serves.

## Resources

As in Nova, a resource names its entity, as Nova's `$model`, and lists its fields; nothing else shows. One class per entity, in any module's `providers`:

```ts
export class PostResource extends Resource<PostEntity> {
    entity = PostEntity;

    fields() {
        return [
            this.make(ID),
            this.make(Text, 'title').sortable(),
            this.make(Textarea, 'body'),
            this.make(Select, 'status').sortable().filterable(),
            this.make(BelongsTo, 'author'),
            this.make(HasMany, 'comments'),
            this.make(DateTime, 'createdAt').sortable(),
        ];
    }

    cards() {
        return [new Value({ label: 'New posts' }), new Trend({ chart: 'line' })];
    }
}
```

The columns say the rest: `title` is required, at most 200 long, as its column is; `status` offers its enum's values; `createdAt`, a `CreateDateColumn`, stays off the forms. Add `@Injectable()` only to a resource with constructor dependencies.

A mistake the compiler can't see stops the app at boot with the reason, for example a `BelongsTo` on a column that's no relation, a search on a number, or sorting by a computed field.

Outside a resource, as in an action's `fields()`, a field is made with the class's own `Text.make('title')`, whose name is any string.

### Properties

| Property | Default |
| --- | --- |
| `entity` | Required: the TypeORM entity it shows. |
| `uriKey` | The entity's table name, if it names one, or its class without `Entity`, in kebab case. Used in URLs. |
| `label`, `singularLabel` | The entity's class without `Entity`: `BlogPostEntity` is "Blog posts" and "Blog post". |
| `title` | The field records are named by: the first of its fields named `name`, `title`, `label`, `email` or `subject`, or the primary key. |
| `search` | Every text field the index or detail page shows. |
| `perPage`, `perPageOptions` | `25`, `[10, 25, 50, 100]`. |
| `defaultSort` | Primary key, newest first. |
| `ranges`, `defaultRange` | The picker over its cards: today, week, month, year, all; this month. |
| `countRows` | `true`. Turn it off on a huge table: pages then have no total. |
| `createDto`, `updateDto` | None. A class-validator DTO the input must also pass. |
| `logActivity` | `true`. |

| Method | Returns |
| --- | --- |
| `fields()` | The fields, in order. Required. |
| `filters()` | The list's own filters, before those of filterable fields. Default: none. |
| `actions()` | Things to do to records. Default: none. |
| `cards()` | Metrics above the list. Default: none. |
| `create`, `update`, `delete`, `forceDelete`, `restore` | Each write. Override one to go through a service, e.g. to hash a password before its row. `delete`, `forceDelete` and `restore` get the `records` as entities: the defaults write by key, which fires no entity subscriber, so an override that must calls `repository.softRemove(records)`, `remove(records)` or `recover(records)`. |

## Fields

`this.make(Class, attribute, label?)` makes a field of that class in a resource's `fields()`. The attribute is the entity property it reads and writes, typed with the entity's properties: the editor offers them as you type, and a wrong one is a compile error. The label defaults to the attribute split at its capitals: `this.make(DateTime, 'createdAt')` is "Created at", and `this.make(DateTime, 'createdAt', 'Creation date')` "Creation date". `this.make(ID)` is the `id`.

What a field doesn't set, its column decides:

- **`required`:** a NOT NULL column with no default, which neither the database nor the entity's class fills in; a `BelongsTo` whose foreign key is NOT NULL.
- **`nullable`:** as the column.
- **`maxLength`:** the column's length.
- **`Select` options:** an enum column's values, labelled as they read.
- **Off the forms:** a generated, create, update, delete date or version column.

Anything set on the field wins: `.required(false)`, `.showOnCreating()`, `.options(...)`.

A function in place of the label computes the value instead, under any name; `.label()` then names it. It is computed only on the pages it shows on. Such a field is read-only and never written:

```ts
this.make(NumberField, 'words', (post) => post.body.split(' ').length)
```

Unless `.readonly(false)` and a form it shows on say otherwise: its value then reaches the resource's `create()` and `update()`, which save it where it lives. `apps/api`'s user role is one, kept by `@repo/rbac`.

| Class | |
| --- | --- |
| `ID` | The primary key, `id` unless told. Sortable, and off the forms; `showOnCreating()` for a key the database doesn't generate. |
| `Text`, `Textarea`, `Email`, `NumberField`, `BooleanField`, `DateField`, `DateTime` | Plain values. `NumberField`, `BooleanField`, `DateField` and `FileField` carry a suffix because `Number`, `Boolean`, `Date` and `File` would shadow JavaScript's globals. |
| `Select` | One of `.options(...)`: `[{ value, label }]`, values (`['draft', 'published']`, labelled as they read), or a TypeScript enum, labelled by its keys. An enum column's values when unset. |
| `Json` | A JSON value, edited as its text; off the index. |
| `Password` | Written, never sent back, never kept in the activity log. Hash it in `create`/`update`. |
| `FileField` | An upload. `.store(async ({ file }) => value)` saves the file and returns what the column keeps; `.preview(value => url)` says where to see it. Also `.acceptedTypes('image/*')` and `.maxSize(bytes)`. |
| `BelongsTo`, `HasMany`, `BelongsToMany` | Relations; see below. |

A custom field extends `Field`, with `readonly type = 'custom'` and `component` set to the name the panel registers it under in `packages/admin-ui/src/components/custom-fields.tsx`.

| Modifier | |
| --- | --- |
| `help` | Text under the field. |
| `sortable` | Sorts the list by it; a column or a `BelongsTo` only. |
| `filterable` | A filter of the list by it: its options for a `Select`, yes or no for a `BooleanField`, days for a `DateField` or `DateTime`. |
| `nullable`, `required` | As named; the column's when unset. |
| `readonly` | Shown, never written; also a `BelongsToMany` no one attaches to or detaches from. |
| `hideFromIndex`, `hideFromDetail`, `hideWhenCreating`, `hideWhenUpdating` | Where it doesn't show. |
| `showOnIndex`, `showOnDetail`, `showOnCreating`, `showOnUpdating` | Where it shows after all. |
| `onlyOnIndex`, `onlyOnDetail`, `onlyOnForms`, `exceptOnForms` | Where it alone shows. |
| `constraints({ min, max, minLength, maxLength, integer })` | Checked by the form and the API. |
| `rules(...fns)` | Extra checks: each returns an error message or `undefined`. |

Only the fields a resource declares are ever written. Invalid input gets a 422 with errors per field. A unique conflict, or deleting a record others refer to, gets a 409.

### Relations

As in Nova, a relation needs both sides:

1. **The entity** declares it with TypeORM: `@ManyToOne` for a `BelongsTo`, `@OneToMany` for a `HasMany` (with the inverse side, so its records can be found), and `@ManyToMany` for a `BelongsToMany`.
2. **The resource** lists it as a field. The fourth argument, after the label, names the resource that lists the related records. When left out, it's the resource of the related entity.

```ts
this.make(BelongsTo, 'author'),                            // the resource of UserEntity
this.make(HasMany, 'comments', 'Comments', CommentResource),
```

The related entity needs a resource of its own; the app refuses to boot otherwise.

## Filters

A filter of a column's value is a field's `.filterable()`. A filter of anything else is a class: the engine reads the value from the query string, checks it, and passes it to `apply()`, which returns the condition.

```ts
class PopularFilter extends Filter<PostEntity> {
    options() {
        return [{ value: 'yes', label: 'Popular' }];
    }

    apply() {
        return { views: MoreThan(100) };
    }
}
```

- `Filter` is a select: `value` is one of its `options()`. `BooleanFilter` takes yes or no.
- `DateFilter` takes whole days, both ends included, in UTC. Its `value` fits a date or datetime column as it is.
- `name` defaults to the class name in kebab case, without `Filter` (`popular`); `label` to that name humanized.

## Actions

```ts
class PublishAction extends Action<PostEntity> {
    destructive = false;
    fields() { return [DateTime.make('at').nullable()]; }

    async handle({ records, values, repository }: ActionHandleInput<PostEntity>) {
        // ...
        return { message: `Published ${records.length}` };
    }
}
```

- **Where they show:** run on checked rows from the list, or from a detail page (`showOnIndex`, `showOnDetail`).
- **Fields:** an action's fields are asked for first, and checked like a form's. Plain values only: no relation, computed or file field.
- **`destructive`:** its run button is red; `confirmText` is said above it.
- **`standalone = true`:** runs on no records. It is in the same dropdown as the others, and can run with no rows checked; the others are greyed out until some are.
- **Returning a file:** return `download: { filename, contentType, content }` and the browser saves it.
- **What the package does itself:** create, update and delete (and restore, for soft deletes). Anything more, e.g. an export, is an action the app writes: `apps/api/src/admin/actions/export-as-csv.action.ts` downloads the rows picked as CSV, with the columns each resource names, or with `all: true` every row, as a standalone action.

## Metrics

A card counts its entity's rows for the range its page picks. `Value`, `Trend` and `Partition` do it themselves, configured with options:

```ts
cards() {
    return [
        new Value({ label: 'New users' }),                       // rows created in the range, against the one before
        new Value({ label: 'Revenue', fn: 'sum', of: 'total', prefix: '€' }),
        new Trend({ label: 'Sign ups over time', chart: 'line' }), // a point a day, week, month or year
        new Partition({ column: 'status' }),                       // the range's rows by status
    ];
}
```

On a resource's index, a card counts that resource's rows unless it names its own `entity`; on the dashboard, every built-in card names one. A card of its own extends a class and calculates its result, with the helpers below:

```ts
class LatestPosts extends Table<PostEntity> {
    async calculate({ range, repository }: MetricInput<PostEntity>) {
        const posts = await latest({ repository, range, relations: { author: true } });

        return { rows: posts.map((post) => ({ title: post.title, link: { resource: 'post', key: post.id } })) };
    }
}
```

| Class | Result | Options, or the helper a subclass calls |
| --- | --- | --- |
| `Value` | `{ value, previous }` | `fn` (`count`, `sum` or `average`), `of` (the column summed), `column` (the date column) · `aggregate()` |
| `Trend` | `{ points }`, one a period | as `Value`, plus `unit` and `chart` (`'bar'` or `'line'`) · `byPeriod()` |
| `Partition` | `{ slices }`; every row's when the entity has no `createdAt` | `column` (grouped by), `labels`, `chart` (`'pie'` or `'bar'`) · `countBy()` |
| `Table` | `{ rows, caption? }`: each row a `title`, `subtitle`, `value` and `link` to a record | a subclass only · `latest()`, the newest rows of the range |

Every card also takes `name`, `label`, `width`, `prefix`, `suffix` and `entity`. A card's name, its key, is its label in kebab case (`"Today's sign-ups"` is `todays-sign-ups`); an unlabelled built-in card's, what it counts and its type, as `posts-value`; else its class name without `Metric`. Two cards of one page can't share one.

**Ranges.** One picker covers every card of a page, in UTC; `calculate()` gets the range picked.

| Range | Covers | Compared with |
| --- | --- | --- |
| `30` | The last 30 days, today included | The 30 days before |
| `'today'` | Today | Yesterday, up to the same time |
| `'week'`, `'month'`, `'year'` | The calendar week (from Monday), month or year, to date | The one before, up to the same moment |
| `'2025'` | That year | The year before |
| `'all'` | Everything | Nothing: `previous` is `null` |
| `'2026-10-01..2026-10-09'` | Days picked on the calendar, both included | As many days before |

- **Defaults:** a page defaults to its `defaultRange`, else this month, else 30 days, else its first range. A range the app can't read stops it at boot.
- **Width:** `'1/4'`, `'1/3'`, `'1/2'`, `'2/3'`, `'3/4'` or `'full'` of a row: a `Value` takes `'1/4'`, the others `'1/2'`. Cards take more when there's little room.
- **Trends:** one point per unit within the range, with a zero for an empty one, each counting its whole unit. Without a `unit`, it picks one for the range's length: days up to a month, weeks up to six months, months up to two years, then years. For `all`, it starts at the first row's period.
- **Comparison:** a `Value` says what `previous` covers, as in `+20% from last month`.
- **Failures:** a card that throws shows as not calculated, and is logged; the others still show.

### Dashboard

The panel's home page: one class extending `Dashboard`, in any module's providers, lists its cards, and one range covers them all.

```ts
export class MainDashboard extends Dashboard {
    cards() {
        return [
            new Value({ entity: UserEntity, label: 'Sign ups', width: '1/3' }),
            new Trend({ entity: UserEntity, label: 'Sign ups over time', width: '2/3' }),
            new Partition({ entity: PostEntity, column: 'status' }),
            new LatestPosts({ entity: PostEntity }),
        ];
    }
}
```

`ranges` and `defaultRange` work as a resource's. A second class extending `Dashboard` stops the app at boot.

## Soft deletes and the activity log

- **Soft deletes:** an entity with a `DeleteDateColumn` is only marked deleted.
  - The list hides deleted records unless its filter says otherwise.
  - Deleted records can be restored, or deleted for good.
- **Activity log:** every write through the panel is kept in `admin_activity`.
  - **What's kept:** creates and deletes with their values, updates with only what changed, attaches, detaches and actions. A password, also one an action asks for, is named but never kept.
  - **Where it shows:** each detail page has a history panel, and `/activity` lists everything.
  - **Actor:** who made it, as the `AdminAuthenticator`'s `actor({ request })` names them: `{ key, title, resource? }`, kept as it was then, and linked to when it names a resource. `null` without one.

## API

| | |
| --- | --- |
| `POST /admin/api/session` | `{ email, password }` to the app's `AdminAuthenticator`; `{ token }`, or 401. Open; every other endpoint asks `authorize()`, a 403 when it says no. |
| `GET /admin/api/me` | Who the panel is signed in as. |
| `GET /admin/api/schema` | Every resource with its fields, filters, actions and cards, plus the dashboard's cards and ranges. |
| `GET /admin/api/resources/:resource` | A page of records: `page`, `perPage`, `sort`, `direction`, `search`, `filter.<name>`, `trashed`. |
| `GET` `POST` `PATCH /admin/api/resources/:resource[/:key]` | Show, create, update. |
| `DELETE /admin/api/resources/:resource` | `{ keys, force? }` |
| `POST /admin/api/resources/:resource/restore` | `{ keys }` |
| `GET /admin/api/resources/:resource/options?search=` | Records to pick from, by title. |
| `GET /admin/api/resources/:resource/:key/relations/:field` | A hasMany's or belongsToMany's records. |
| `POST …/relations/:field/attach`, `…/detach` | `{ keys }`; one already linked, or not linked, is left as it is. |
| `POST /admin/api/resources/:resource/actions/:action` | `{ keys, values }` |
| `POST /admin/api/resources/:resource/files/:field` | Multipart `file`; returns the value to save. |
| `GET /admin/api/resources/:resource/cards`, `/admin/api/dashboard` | Every card of the page: `?range=month`, `?range=2026-10-01..2026-10-09`. |
| `GET /admin/api/activity`, `/admin/api/resources/:resource/:key/activity` | `?page=` |
| `GET /admin/api/search?q=` | Every resource's records whose title matches. |

## Tests

```bash
cd packages/admin && rm -rf .test-dist && ./node_modules/.bin/tsc -p tsconfig.test.json && node --test ".test-dist/**/*.spec.js"
```

The Postgres specs run only when `TEST_DATABASE_URL` is set. Each run creates its own schema and drops it afterwards.
