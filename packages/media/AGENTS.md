# @repo/media: a guide for agents

File uploads for a NestJS app on TypeORM and Postgres. Files are stored on the local disk or in S3, attached to the app's models, and converted in the background into the image sizes declared. This file is enough to use the package without reading its source: everything listed is public API, and anything else is internal. `README.md` goes deeper. Where the repo has `apps/api`, it shows the package wired into an app.

## Rules

- **Stack:** NestJS 12, TypeORM 1.1 on Postgres, class-validator, sharp, Express.
  - Node ≥ 26.1, the first with `crypto.randomUUIDv7()`.
  - The app's tsconfig sets `experimentalDecorators`, `emitDecoratorMetadata` and `useDefineForClassFields: false`, as Nest needs.
- **Independent:** the package imports no other `@repo/*` package. The app combines it with others.
- **No `forRoot()`:** import `MediaModule`. It isn't global, so import it in every module that uses `MediaService` or `MediaFileInterceptor`.
- **One object parameter** for every service method, even for one value: `mediaService.findUrls({ id })`.
- **A model is a `ModelRef`:** `{ modelType, modelId }`, passed as flat fields in every method input.
  - `modelType` is the entity's **table name** (`@Entity('user')` → `'user'`), and `modelId` its integer `id`.
  - Write one helper per entity, e.g. `const userRef = (id: number) => ({ modelType: 'user', modelId: id })`.
- **No foreign key reaches an attachment.** When the app deletes a model, call `mediaService.deleteForModel(ref)`, or its media and files stay behind.
- **Tables:** `media` and `media_attachment`.
  - They're exported as `MEDIA_ENTITIES`, for a data source that lists its entities, as the TypeORM CLI's must.
  - A change to them needs a migration in the app.
  - A media's key is a UUIDv7 that `MediaService` generates, not the database; callers never pass it.
- **Config** comes from the environment and is validated at boot: a missing or invalid variable stops the app, listing every problem. Inject it with `@Inject(mediaConfig.KEY)`.
- **Background conversions** run in every instance:
  - a sweep at boot, every minute, and after every upload;
  - safe with several instances;
  - call `app.enableShutdownHooks()`, so the conversion underway finishes on SIGTERM.
- **Consumed from `dist`:** after changing the package, rebuild it with `./node_modules/.bin/tsc -p tsconfig.build.json` in this directory, or keep `pnpm dev` running.

## Setup

```ts
// main.ts, with an Express app: NestFactory.create<NestExpressApplication>(AppModule)
serveLocalMedia(app);
app.enableShutdownHooks();
```

`serveLocalMedia(app)` serves the local disk's files at `/uploads`. It sets `X-Content-Type-Options: nosniff` and a sandboxing `Content-Security-Policy`, so an SVG can't run script on the app's origin. On S3 it does nothing, since the bucket or CDN serves the files.

| Env | Default |
| --- | --- |
| `STORAGE_DISK` | `local` (or `s3`). Local storage serves and converts on one instance only, so use S3 with several. |
| `STORAGE_LOCAL_PATH` | `./uploads` |
| `STORAGE_MAX_FILE_SIZE` | `5242880` bytes |
| `STORAGE_MAX_IMAGE_PIXELS` | `50000000` (width × height) |
| `STORAGE_ALLOWED_MIME_TYPES` | `image/jpeg,image/png,image/webp` |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | Required for `s3` |
| `S3_CDN_URL` | Optional; urls point here instead of `<endpoint>/<bucket>` |
| `S3_ACL` | Optional canned ACL, e.g. `public-read` for DigitalOcean Spaces |

## Declaring collections

Put `@Media()` on a property of the entity. The property holds nothing; its name is the collection's.

```ts
@Entity('user')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Media({
        // an upload replaces the one before it
        single: true,
        conversions: {
            thumb: { width: 96, height: 96, fit: 'cover', format: 'webp' },
        },
    })
    avatar?: never;
}
```

- **`ConversionSpec`:**
  - `width?`, `height?`
  - `fit?`: `'cover'`, `'contain'`, `'fill'`, `'inside'` or `'outside'`
  - `format?`: `'webp'` (the default), `'jpeg'`, `'png'` or `'avif'`
  - `quality?`: 80 by default; png gets none
  - Conversions never enlarge an image, follow its EXIF rotation, and flatten jpeg onto white. No conversion can be named `original`.
- **`single: true`** keeps one file per model, the newest.
- **Where media can go:**
  - Only an entity that declares `@Media()` can take media; `uploadAndAttach()` and `attach()` refuse any other with a 400.
  - Only `uploadAndAttach()` checks the collection, and only it converts and applies `single`.
  - A media is stored under its collection's name, `<modelType>.<collection>` (e.g. `user.avatar`). So `findForModel({ collection })` never finds one uploaded with `upload()` and then attached.

## Uploading

```ts
@Put('avatar')
@UseInterceptors(MediaFileInterceptor('file'))
async setAvatar(
    @CurrentUser() { id }: AuthUser,
    @UploadedFile() file: Express.Multer.File,
): Promise<MediaUrlsOutput> {
    const { urls } = await this.mediaService.uploadAndAttach({
        ...userRef(id),
        collection: 'avatar',
        file,
    });

    return urls;
}
```

- **The interceptor:** use `MediaFileInterceptor(field)` rather than Nest's `FileInterceptor`. It refuses a file over the size limit (413) or of a type outside the allow-list (415) while the upload streams in.
- **The stored type** is what the bytes are, read by sharp, not what the client declared:
  - an image outside the allow-list is a 415;
  - a corrupt image, or one past the pixel limit, is a 422;
  - a declared non-image type outside the allow-list is a 415, even without the interceptor.

## MediaService

| Method | Input | Returns |
| --- | --- | --- |
| `uploadAndAttach` | `{ file, modelType, modelId, collection }` | `MediaOutput`. Conversions are made after the response. |
| `upload` | `{ file, collectionName }` | `MediaOutput`, attached to nothing. `collectionName` is letters, digits, `_`, `-` and `.`. |
| `attach` | `{ mediaId, modelType, modelId }` | `MediaAttachmentOutput { media, modelType, modelId }`; 409 if already attached, 404 if missing |
| `detach` | `{ mediaId, modelType, modelId }` | `void`; the media and its files stay |
| `findForModel` | `ModelRef & { collection? }` | `MediaOutput[]`, newest first |
| `findUrls` | `{ id }` | `MediaUrlsOutput` |
| `delete` | `{ id }` | `void`, with its files |
| `deleteForModel` | `ModelRef` | `ReleaseOutput { deleted, detached }`. Media only this model had are deleted with their files; shared ones are only detached. |

- **`MediaOutput`:** `{ id, name, fileName, mimeType, size, conversions, urls, createdAt, updatedAt }`, where `conversions` is `Record<name, { fileName, status, attempts }>`.
- **`MediaUrlsOutput`:** `{ original: string; conversions: Record<name, string | null> }`. A conversion's url stays `null` until it is done, so show the original meanwhile.
- **DTOs for controllers:**
  - `MediaUploadInput`, `MediaUploadAndAttachInput` (a multipart body: it reads `modelId` as a number)
  - `MediaAttachmentInput`
  - `MediaModelQuery` (a query string)
  - `WithFile<Dto>` adds the `file` to a service input.
- **Conversion states:** `ConversionStatus.Pending → Processing → Done | Failed`.
  - A storage failure is retried on a later sweep, 3 attempts in all.
  - An image sharp can't convert fails at once.

## Storage

- **The interface:** every storage implements `IStorageService`, injected as `STORAGE_SERVICE`. It has:
  - `readonly disk`, which each media row records;
  - `put({ path, buffer, contentType? })` and `get({ path })`;
  - `deletePrefix({ prefix })` and `url({ path })`.
- **Implementations:**
  - `LocalStorageService` keeps files under `STORAGE_LOCAL_PATH` and refuses a path outside it.
  - `S3StorageService` times out a call after 30 s.
  - `MemoryStorageService` is for tests.

## In apps/api

- `src/users/user.entity.ts` and `src/posts/post.entity.ts`: the `@Media()` declarations
- `src/users/me.controller.ts` and `src/users/users.service.ts`: an avatar
- `src/posts/posts.controller.ts` and `src/posts/posts.service.ts`: post images, at most 4
- `src/app.setup.ts`: `serveLocalMedia`
- `UsersService.delete()` and `PostsService.remove()`: `deleteForModel` when a model goes

## Testing

From this directory:

```sh
./node_modules/.bin/tsc --noEmit -p tsconfig.json && rm -rf .test-dist && ./node_modules/.bin/tsc -p tsconfig.test.json && node --test --test-timeout=60000 ".test-dist/**/*.spec.js"
```

- **No disk in an app's tests:** swap in `MemoryStorageService` with `Test.createTestingModule(...).overrideProvider(STORAGE_SERVICE).useValue(new MemoryStorageService())`. Its `files` map holds what was stored.
- **Lint** from the repo root with `./node_modules/.bin/biome check packages/media`.
- Prefer these binaries over pnpm scripts, which check, and may reinstall, the whole workspace first.

## Gotchas

- **Never `repository.remove(media)` and then read `media.directory`:** TypeORM clears the key on remove.
- **`STORAGE_DISK=local` works with one instance only.**
- **Nest DI** reads constructor parameter types at runtime. Import injected classes as values, never with `import type`.
- **TypeORM 1.x throws on `undefined` or `null` in a `where`.** Build conditions with spreads, and match SQL NULL with `IsNull()`.
