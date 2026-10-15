# apps/api: a guide for agents

A NestJS demo api: sign-up and sessions, posts with images, comments, likes, roles, an inbox, and the admin panel. It exists to show the backend packages wired into a real app, so copy from it.

Each package explains itself in its own `AGENTS.md` under `packages/<name>/`. Read that before using the package; this file covers the app around them.

## Where things are wired

| What | Where |
| --- | --- |
| App module, config, database options | `src/app.module.ts`, `src/config/app.config.ts`, `src/config/data-source.ts` |
| Boot steps: migrations, validation, shutdown hooks, local media | `src/app.setup.ts`, used by `src/main.ts` and the e2e harness |
| Sessions, and one global guard for authentication and roles | `src/auth/auth.service.ts`, `src/auth/auth.guard.ts` |
| Request helpers: `userRef(id)`, `@Public()`, `@CurrentUser()` | `src/auth/current-user.ts` |
| Roles, their permissions, and seeding them and the admin account | `src/auth/permissions.ts`, `src/roles/roles.seeder.ts` |
| Uploads: an avatar, and post images | `src/users/me.controller.ts`, `src/posts/posts.controller.ts` |
| Notifications, the inbox and devices | `src/notifications/`, `src/inbox/inbox.controller.ts` |
| Admin panel | `src/admin/` |
| Cleaning up after a deleted model | `UsersService.delete()` in `src/users/users.service.ts`, `PostsService.remove()` in `src/posts/posts.service.ts` |

- **A model** is referred to the packages' way, `{ modelType: <table name>, modelId }`, through helpers: `userRef(id)` in `src/auth/current-user.ts` and `postRef(id)` in `src/posts/post.entity.ts`.
- **Deleting a model:** polymorphic rows have no foreign key. Deleting a user or a post also calls each package's `deleteForModel()`, after the row goes; a failure there is only logged. Follow `UsersService.delete()` when adding a model that has media, roles or notifications.

## Database and migrations

- **`src/config/data-source.ts`:**
  - `dataSourceOptions(database)` lists every entity, the app's and the packages' (`*_ENTITIES`). The app doesn't use `autoLoadEntities`, so a new entity goes in this list.
  - The TypeORM CLI connects through `src/data-source.ts`, which uses the same options.
  - `migrate(dataSource)` runs pending migrations under a Postgres advisory lock, so instances booting together take turns. `setUpApp()` calls it before anything that reads the tables.
- **After changing an entity,** with Postgres running, from this directory:
  ```sh
  ./node_modules/.bin/tsc -p tsconfig.build.json && node --env-file=.env node_modules/typeorm/cli.js migration:generate -d dist/data-source.js src/migrations/<name>
  ```
  - `pnpm migration:generate` does the same with the name `migration`.
  - Review the file, then format it with `./node_modules/.bin/biome check --write apps/api/src/migrations` from the repo root.
  - `migration:revert` undoes the last one.
- **Local services:** `docker compose -f docker/compose.yml up -d` starts:
  - Postgres at `postgres://atlas:atlas@localhost:5432/atlas`;
  - Mailpit, which catches every mail, at `http://localhost:8025`.
- **Seeding:** `node --env-file=.env scripts/seed.ts` fills the database with made-up users, posts and comments.

## Configuration

- **Your env:** copy `.env.example` to `.env`. The api, media and notification variables are each validated at boot.
- **`ADMIN_EMAIL` and `ADMIN_PASSWORD`:** the admin account is created on the first boot, so set the password first.
  - An existing account with that email that isn't an admin stops the boot, rather than being made admin, as anyone can register an email.
  - Give such an account the role in the panel, or set another `ADMIN_EMAIL`.
- **Node:** ≥ 26.1.

## Testing

From this directory, with Postgres running:

```sh
./node_modules/.bin/tsc --noEmit -p tsconfig.test.json && rm -rf .test-dist && ./node_modules/.bin/tsc -p tsconfig.test.json && node --test --test-concurrency=1 --test-timeout=120000 ".test-dist/src/**/*.spec.js" ".test-dist/test/**/*.e2e-spec.js"
```

- **Unit tests** are `src/**/*.spec.ts`. **End-to-end tests** are `test/*.e2e-spec.ts`.
- **The e2e harness** (`test/harness.ts`) boots the real app, as `main.ts` does, on a database of its own that it drops afterwards. It also runs an SMTP sink and an Expo stub, so tests read the mails and pushes the app sent.
- **Packages first:** the packages are consumed from their `dist`, so build a package you changed before testing the api.
- **Lint** from the repo root with `./node_modules/.bin/biome check apps/api`.
- Prefer these binaries over pnpm scripts, which check, and may reinstall, the whole workspace first.

## Production notes

- **Rate limiting:** limit `POST /auth/register`, `POST /auth/login` and `POST /admin/api/session` at the edge (nginx or the load balancer). The api doesn't.
- **Storage:** use S3 (`STORAGE_DISK=s3`) when running more than one instance. Local storage serves and converts on one instance only.
- **Deploying:** there is no deploy setup for the api yet: no Dockerfile, no health endpoint, no release workflow.
