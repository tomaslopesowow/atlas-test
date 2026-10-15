# @repo/admin: a guide for agents

A Nova-style admin panel for a NestJS app on TypeORM and Postgres. The app declares resources. `@repo/admin` serves a JSON API at `/admin/api` and the prebuilt React panel from `@repo/admin-ui` at `/admin`. `@repo/admin-contract` holds the types the two share.

This file is enough to use the three without reading their source: everything listed is public API, and anything else is internal. `README.md` goes deeper. Where the repo has `apps/api`, it shows the panel wired into an app.

## Rules

- **Stack:** NestJS 12, TypeORM 1.1 on Postgres, class-validator; the panel is React 19, Vite and Tailwind v4. The app's tsconfig sets `experimentalDecorators`, `emitDecoratorMetadata` and `useDefineForClassFields: false`, as Nest needs.
- **Independent:** the package imports no other `@repo/*` module package. The app combines it with others, e.g. its sign-in can check a role from rbac.
- **No `forRoot()`, no registration:** import `AdminModule`. Resources, the dashboard and the sign-in are found by the class they extend, in any module's `providers`. A class needs `@Injectable()` only when its constructor takes dependencies.
- **Boot-time checks:** a mistake the compiler can't catch stops the app at boot with a message. Read the boot error. Examples:
  - a field that is no column;
  - a relation whose entity has no resource;
  - a select without options;
  - two fields, filters, actions or cards with one name;
  - a range it can't read.
- **Table:** `admin_activity`, the activity log.
  - It's exported as `ADMIN_ENTITIES`, for a data source that lists its entities, as the TypeORM CLI's must.
  - The app's migration creates it.
- **Consumed from `dist`:** after changing the package, rebuild it:
  - `./node_modules/.bin/tsc -p tsconfig.build.json` here;
  - `./node_modules/.bin/tsc -p tsconfig.json` in `packages/admin-contract`;
  - `./node_modules/.bin/vite build` in `packages/admin-ui`.
  - `pnpm dev` watches the first two. The api serves the panel from `packages/admin-ui/dist`, so a panel change shows at `/admin` only after `vite build`. Alternatively, work on the Vite dev server: `pnpm --filter @repo/admin-ui dev` serves the panel on port 3100, proxying `/admin/api` to `API_URL` (`http://localhost:3001`).

## Setup

```ts
import { AdminModule, AdminUiController } from '@repo/admin';

// with a global guard, let the panel's pages and its sign-in through; Public is the app's own decorator
Public()(AdminUiController);

@Module({
    imports: [AdminModule, UsersModule /* whatever the resources inject */],
    // every entity a relation field points at needs a resource too
    providers: [
        UserResource,
        PostResource,
        CommentResource,
        MainDashboard,
        AdminLogin,
    ],
})
export class AdminPanelModule {}
```

### Sign-in

Exactly one class extends `AdminAuthenticator`:

```ts
@Injectable()
export class AdminLogin extends AdminAuthenticator {
    constructor(private readonly auth: AuthService) {
        super();
    }

    async login({ email, password }: SessionInput) {
        const session = await this.auth.login({ email, password });

        return session && { token: session.token };
    }

    async authorize({ request }: { request: object }) {
        return (request as AuthRequest).user?.isAdmin === true;
    }
}
```

- `login({ email, password })` returns `{ token }`, or `null` when they're wrong. The panel then sends the token as a Bearer.
- `authorize({ request })` says whether a request may use the API, from what the app's guard left on the request. It's required; until it says yes, nothing works.
- `actor({ request })` (optional) returns `{ key, title, resource? }`, who made a change, for the activity log.
- `logout({ request })` (optional) ends the session when the panel signs out (`DELETE /admin/api/session`), so a copied token stops working.
- **Rate limiting:** the package doesn't rate-limit `POST /admin/api/session`. Limit it at the edge in production, like the app's own login.

## Resources

```ts
export class PostResource extends Resource<PostEntity> {
    entity = PostEntity;
    override title = 'body';
    override defaultSort: Sort = { field: 'createdAt', direction: 'desc' };

    override fields() {
        return [
            this.make(ID),
            this.make(BelongsTo, 'author').sortable(),
            this.make(Textarea, 'body').showOnIndex(),
            this.make(Select, 'status').sortable().filterable(),
            this.make(DateTime, 'createdAt').sortable(),
            this.make(HasMany, 'comments'),
        ];
    }
}
```

**Properties** (only `entity` is required):

| Property | Default |
| --- | --- |
| `uriKey` | The table name, or the class name without `Entity`, in kebab case |
| `label`, `singularLabel` | From the class name |
| `title` | The first of `name`, `title`, `label`, `email` and `subject`, or the key |
| `search` | Every text field a page shows |
| `perPage`, `perPageOptions` | `25` and `[10, 25, 50, 100]` |
| `defaultSort` | The key, descending |
| `countRows` | `true`. Set `false` for a huge table: its pages then have no total. |
| `createDto`, `updateDto` | class-validator DTOs the input must also pass |
| `logActivity` | `true` |
| `ranges`, `defaultRange` | The picker over the resource's cards |

**Methods:**
- `fields()` (required), `filters()`, `actions()`, `cards()`.
- The writes, to override when a write must go through a service, such as hashing a password or cleaning up a model's polymorphic rows:
  - `create({ values, repository })`
  - `update({ record, values, repository })`
  - `delete`, `forceDelete` and `restore`, each given `{ keys, records, repository }`
- Import the input types from `@repo/admin`: `CreateInput`, `UpdateInput`, `DeleteRecordsInput`.
- **Which delete to override:** `delete()` only marks a record deleted when the entity has a `DeleteDateColumn`. Otherwise it calls `forceDelete()`, so cleanup belongs in `forceDelete()`.
- **Subscribers:** the default writes go by key, which fires no entity subscriber. An override that needs them calls `repository.softRemove(records)`, `remove(records)` or `recover(records)`.

**Soft deletes:** an entity with a `DeleteDateColumn` is only marked deleted. Lists hide its deleted records unless `?trashed=with` or `?trashed=only`, and they can be restored or deleted for good.

**Activity log:** every write through the panel is kept, with what changed: creates and deletes with their values, updates with only what changed, attaches, detaches and actions. Passwords are named, never kept.

## Fields

- **Making one:** `this.make(Class, 'property', 'Label'?)`, where the property is typed by the entity's keys, so a wrong one doesn't compile. `this.make(ID)` is the `id`.
- **Computed fields:** `this.make(NumberField, 'words', (post) => post.body.length)` is read-only and only computed on the pages it shows on. `.readonly(false)` passes its value on to `create()` and `update()`, which save it where it lives.
- **Outside a resource**, such as an action's `fields()`, use the class's own `make`: `Text.make('note')`.

| Class | Notes |
| --- | --- |
| `ID`, `Text`, `Textarea`, `Email` | Plain values |
| `NumberField`, `BooleanField` | Plain values |
| `DateField`, `DateTime` | A `2026-10-08` date, and an ISO date and time |
| `Password` | Written, never sent back. Hash it in `create()` and `update()`. |
| `Select` | `.options([{ value, label }] \| values \| Enum)`; an enum column's values when unset |
| `Json` | Edited as text |
| `FileField` | `.store(async ({ file }) => valueToKeep)`, `.preview((value, record) => url)`, `.acceptedTypes('image/*')`, `.maxSize(bytes)` (10 MB). It is uploaded first; the form then saves the value `store()` returned. |
| `BelongsTo`, `HasMany`, `BelongsToMany` | `(attribute, label?, ResourceClass?)`. The entity must declare the TypeORM relation, with its inverse side for the to-many fields, and the related entity needs a resource of its own. |

- **Column defaults:** the column decides what the field doesn't set: `required`, `nullable`, `maxLength`, an enum's options, and keeping generated and timestamp columns off the forms. Anything set on the field wins.
- **Modifiers:**
  - `label`, `help`
  - `sortable` (a column or a `BelongsTo`), `filterable` (a select, boolean or date field)
  - `readonly`, `nullable`, `required`
  - `hideFromIndex`, `hideFromDetail`, `hideWhenCreating`, `hideWhenUpdating`
  - `showOnIndex`, `showOnDetail`, `showOnCreating`, `showOnUpdating`
  - `onlyOnIndex`, `onlyOnDetail`, `onlyOnForms`, `exceptOnForms`
  - `constraints({ min, max, minLength, maxLength, integer })`
  - `rules((value) => message | undefined)`
- **Invalid input:** a 422 `{ message, errors: { [field]: string[] } }`. This includes a file over a `FileField`'s `maxSize` or outside its `acceptedTypes`; only a file over 50 MB is refused with a 413 while it streams in. A unique conflict, or deleting a record others refer to, is a 409.
- **A custom field** extends `Field`, with `readonly type = 'custom'` and `component = 'name'`. Register the component in `packages/admin-ui/src/components/custom-fields.tsx` (an `Input` and a `Value`), then rebuild the panel.

## Filters

`.filterable()` covers a column's own values. For anything else, extend a class and return a TypeORM `FindOptionsWhere` from `apply({ value })`:

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

- `Filter` is a select: `value` is one of its `options()`.
- `BooleanFilter` gets `true` or `false`.
- `DateFilter` gets a `FindOperator` covering whole days, both ends included, in UTC, which fits a date or datetime column as it is.
- `name` defaults to the class name in kebab case without `Filter`, and `label` to that name, humanized.

## Actions

```ts
class PublishAction extends Action<PostEntity> {
    override fields() {
        return [DateTime.make('at').nullable()];
    }

    async handle({ records, values, repository }: ActionHandleInput<PostEntity>) {
        // values.at is a Date or null, as the field checked it; publish the records with the repository or a service

        return { message: `Published ${records.length}` };
    }
}
```

- **Actions aren't providers:** `actions()` creates them. An action that needs a service takes it through its constructor, from the resource's: `new PublishAction(this.postsService)`.

- **Properties:** `name`, `label`, `destructive` (a red run button), `confirmText`, `showOnIndex`, `showOnDetail`, and `standalone` (runs with no records, e.g. an import or a report).
- **`fields()`** are asked for first, and checked as a form's. They're plain values only: no relation, computed or file field.
- **`handle()`** returns an `ActionResult`: `{ message?, download?: { filename, contentType, content } }`. The browser saves a download.

## Cards and the dashboard

```ts
override cards() {
    return [
        new Value({ label: 'New posts' }),
        new Value({ label: 'Revenue', fn: 'sum', of: 'total', prefix: '€' }),
        new Trend({ label: 'Posts over time', chart: 'line' }),
        new Partition({ column: 'status' }),
    ];
}
```

- **Every card** takes `name`, `label`, `prefix`, `suffix`, `width` (`'1/4'`, `'1/3'`, `'1/2'`, `'2/3'`, `'3/4'` or `'full'`) and `entity`. Those options are `MetricOptions`.
- **Built-in cards:**
  - `Value({ fn: 'count' | 'sum' | 'average', of, column })` counts the rows created in the range, or sums or averages a column. It's compared with the period before.
  - `Trend({ ...as Value, unit, chart: 'bar' | 'line' })` gives a point a day, week, month or year.
  - `Partition({ column, labels, chart: 'pie' | 'bar' })` counts the rows by a column's values.
- **Your own card:** extend `Table`, or `Metric`, or any card. Implement `calculate({ range, repository, dataSource }: MetricInput)` with the helpers `aggregate`, `byPeriod`, `countBy` and `latest`. A `Table` returns `{ rows: { title, subtitle?, value?, link?: { resource, key } }[], caption? }`.
- **Whose rows:** on a resource, a card counts that resource's rows unless it names an `entity`.
- **Ranges** (`RangeOption`): a number of days, `'today'`, `'week'`, `'month'`, `'year'`, `'all'`, a year such as `'2025'`, or `{ value, label }` of these. A page's calendar also picks a span of days, `'2026-10-01..2026-10-09'`. Everything is in UTC.
- **The dashboard** is one class extending `Dashboard`, with `cards()`, `ranges` and `defaultRange`. Every built-in card on it needs an `entity`.

## API

Every endpoint calls `authorize()`, except the sign-in and the panel's own pages.

| Endpoint | |
| --- | --- |
| `POST /admin/api/session` | `{ email, password }` gets `{ token }`, or a 401. Open to anyone. |
| `DELETE /admin/api/session` | Signs out through `logout()`; a 204 |
| `GET /admin/api/me`, `/admin/api/schema` | Who is signed in; and every resource's fields, filters, actions and cards, plus the dashboard |
| `GET /admin/api/resources/:resource` | A page of records: `?page&perPage&sort&direction&search&trashed=with\|only&filter.<name>=…`. A date filter takes `filter.<name>.from` and `filter.<name>.to`. |
| `GET`, `POST`, `PATCH /admin/api/resources/:resource[/:key]` | Show, create and update |
| `DELETE /admin/api/resources/:resource` | `{ keys, force? }` |
| `POST /admin/api/resources/:resource/restore` | `{ keys }` |
| `GET …/:resource/options?search=` | Records to pick from, for a `BelongsTo` |
| `GET …/:resource/:key/relations/:field` | The records of a to-many field |
| `POST …/relations/:field/attach`, `…/detach` | `{ keys }` |
| `POST …/:resource/actions/:action` | `{ keys, values }` |
| `POST …/:resource/files/:field` | A multipart `file`; returns the value to save |
| `GET …/:resource/cards`, `/admin/api/dashboard` | `?range=` |
| `GET /admin/api/activity?resource=&page=`, `…/:resource/:key/activity?page=` | The activity log |
| `GET /admin/api/search?q=` | Every resource's records whose title matches |

The response types (`ListResponse`, `RecordResponse` and the rest) come from `@repo/admin-contract`, and `@repo/admin` re-exports them.

## In apps/api

- `src/admin/admin-panel.module.ts`: the module, with `Public()(AdminUiController)`
- `src/admin/admin-login.ts`: the sign-in through the app's `AuthService`; `authorize` checks the `admin` role from rbac
- `src/admin/resources/`: user, post and comment resources. The user resource hashes passwords, edits a role through rbac and cleans up in `forceDelete()`.
- `src/admin/main.dashboard.ts`: the dashboard, with a `Table` card of its own
- `src/admin/actions/export-as-csv.action.ts`: a CSV export, for the records picked or, standalone, every row

## Testing

From this directory:

```sh
./node_modules/.bin/tsc --noEmit -p tsconfig.json && rm -rf .test-dist && ./node_modules/.bin/tsc -p tsconfig.test.json && TEST_DATABASE_URL=postgres://user:password@localhost:5432/db node --test --test-timeout=60000 ".test-dist/**/*.spec.js"
```

- **Postgres:** without `TEST_DATABASE_URL`, the Postgres spec is skipped. Each run makes a schema of its own.
- **The panel:** `node --test 'src/**/*.test.ts'` in `packages/admin-ui`.
- **Lint** from the repo root with `./node_modules/.bin/biome check packages/admin packages/admin-ui`.
- Prefer these binaries over pnpm scripts, which check, and may reinstall, the whole workspace first.

## Gotchas

- **Restart after changing a resource:** resources are resolved once, at boot.
- **A relation field needs the related entity's resource;** without it, boot stops.
- **The panel at `/admin` is the built `dist`.** Rebuild it to see a panel change there.
- **Nest DI** reads constructor parameter types at runtime. Import injected classes as values, never with `import type`.
- **TypeORM 1.x throws on `undefined` or `null` in a `where`.** In a filter's `apply()`, build conditions with spreads, and match SQL NULL with `IsNull()`.
