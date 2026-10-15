# @repo/media

File uploads for NestJS + TypeORM (Postgres). A file is stored on the local disk or in S3, attached to your models, and converted into the sizes you declare in the background.

## Setup

```ts
import { MediaModule } from '@repo/media';

@Module({
    imports: [
        ConfigModule.forRoot(),
        // or list MEDIA_ENTITIES yourself
        TypeOrmModule.forRoot({ /* ... */ autoLoadEntities: true }),
    ],
})
export class AppModule {}

// in every module that uses MediaService or MediaFileInterceptor
@Module({ imports: [MediaModule] })
export class UsersModule {}
```

The TypeORM CLI doesn't see `autoLoadEntities`, so list `MEDIA_ENTITIES` in your migrations data source:

```ts
import { MEDIA_ENTITIES } from '@repo/media';

export default new DataSource({ /* ... */ entities: [...MEDIA_ENTITIES, UserEntity] });
```

In `main.ts`, serve the local files:

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule);

serveLocalMedia(app);
// so the conversion underway finishes on SIGTERM
app.enableShutdownHooks();
```

`serveLocalMedia()` serves `STORAGE_LOCAL_PATH` at `/uploads` with `X-Content-Type-Options: nosniff`, so a file is always served as the type its extension names, and with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`, so a file such as an SVG runs no script on your app's origin. On S3 it does nothing: the bucket or CDN serves the files.

Copy [.env.example](.env.example) into your `.env`. The variables are checked at boot, and the app won't start if one is missing or invalid.

| Variable | |
| --- | --- |
| `STORAGE_DISK` | `local` or `s3`. Default `local`, which works for one instance only: other instances can neither serve its files nor convert them, so use `s3` when you run more than one. |
| `STORAGE_LOCAL_PATH` | Where `local` keeps files. Default `./uploads`, resolved against the working directory at boot. |
| `STORAGE_MAX_FILE_SIZE` | In bytes. Default `5242880` (5 MB). |
| `STORAGE_MAX_IMAGE_PIXELS` | Width × height. Default `50000000`. A small compressed file can hide a huge image. |
| `STORAGE_ALLOWED_MIME_TYPES` | Comma-separated. Default `image/jpeg,image/png,image/webp`. |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | Required for `s3`. |
| `S3_CDN_URL` | Optional. Urls point here instead of `<endpoint>/<bucket>`. |
| `S3_ACL` | Optional canned ACL for every upload, e.g. `public-read`. Unset sends none and leaves access to the bucket policy, since AWS buckets reject ACLs by default. DigitalOcean Spaces makes a file public through its ACL, so set `public-read` there. |

## Models

Media links to a model by `{ modelType, modelId }` (`ModelRef`), where `modelType` is the entity's table name: `@Entity('user')` → `{ modelType: 'user', modelId: 5 }`. `modelId` is an integer, so the entity's primary key must be an integer `id`.

Declare a collection with `@Media()` on a property. The property holds nothing; its name is the collection's.

```ts
import { Media } from '@repo/media';

@Entity('user')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Media({
        // an upload replaces the one before it
        single: true,
        conversions: {
            square: { width: 400, height: 400, fit: 'cover' },
            thumb: { width: 96, height: 96, fit: 'cover', format: 'jpeg', quality: 70 },
        },
    })
    avatar?: never;
}
```

- Only an entity that declares `@Media()` takes media, so a request can't attach a file to any table. Attaching to one that doesn't, or to an id with no row, is a 400 or 404.
- A conversion has `width`, `height`, `fit`, `format` (`webp`, the default, `jpeg`, `png` or `avif`) and `quality` (default 80). It honours EXIF orientation and never enlarges. A conversion can't be named `original`.
- Files live at `<modelType>.<collection>/<media id>/`, e.g. `user.avatar/019a…/original.png` and `user.avatar/019a…/thumb.jpg`.

## Uploading

```ts
constructor(private readonly mediaService: MediaService) {}

/** Multipart, the image in `file`. */
@Put('avatar')
@UseInterceptors(MediaFileInterceptor('file'))
async setAvatar(@CurrentUser() { id }: AuthUser, @UploadedFile() file: Express.Multer.File): Promise<MediaUrlsOutput> {
    const { urls } = await this.mediaService.uploadAndAttach({ modelType: 'user', modelId: id, collection: 'avatar', file });

    return urls;
}
```

- `MediaFileInterceptor` is `FileInterceptor` with media's limits, enforced while the upload streams in: a type outside `STORAGE_ALLOWED_MIME_TYPES` is a 415, a file over `STORAGE_MAX_FILE_SIZE` a 413.
- The service then checks the bytes, not what the client says: the image's real type must be allowed too, and fit within `STORAGE_MAX_IMAGE_PIXELS`. A file that isn't an image keeps its declared type, and the service refuses that type with a 415 too when it's outside `STORAGE_ALLOWED_MIME_TYPES`, so the allow-list holds even without the interceptor.
- `uploadAndAttach()` returns a `MediaOutput` straight away; the conversions run after the response.

To store a file in a collection of its own, attached to no model and without conversions:

```ts
const media = await this.mediaService.upload({ collectionName: 'imports', file });
```

A collection name is letters, digits, `_`, `-` and `.`, starting with a letter or digit. For request bodies, use `MediaUploadAndAttachInput` and `MediaUploadInput`.

## Reading

```ts
// newest first; without a collection, every media attached to the model
const avatars = await this.mediaService.findForModel({ modelType: 'user', modelId: id, collection: 'avatar' });

const { original, conversions } = await this.mediaService.findUrls({ id: mediaId });
```

A conversion's url is `null` until it's done, so a client never loads a missing file; its `status` is on `MediaOutput.conversions`. Local urls are relative (`/uploads/...`); S3 urls are absolute. For a query string, use `MediaModelQuery`.

## Attaching, detaching and deleting

```ts
await this.mediaService.attach({ mediaId, modelType: 'post', modelId: 7 }); // 409 if already attached
await this.mediaService.detach({ mediaId, modelType: 'post', modelId: 7 }); // keeps the media and its files

await this.mediaService.delete({ id: mediaId }); // the media, its files and every link

// after deleting the post
const { deleted, detached } = await this.mediaService.deleteForModel({ modelType: 'post', modelId: 7 });
```

A media can be attached to several models. The links are polymorphic, so they have no foreign key to your tables, and deleting a model leaves its media behind: call `deleteForModel()` when you delete one. What only that model had is deleted with its files; what other models still have is only detached. For request bodies, use `MediaAttachmentInput`.

## Conversions

- They run in the background: `uploadAndAttach()` starts a sweep, which converts the media with conversions due, 50 at a time and oldest first. A sweep also runs at boot and every minute after.
- A failed attempt goes back to waiting and is tried again on a later sweep, 3 attempts in all, then it's marked `FAILED`. A file the image library can't convert fails right away.
- It's safe with several processes: each conversion is claimed on its row, so only one process converts it. One a stopped process left behind is picked up after 5 minutes, which costs it an attempt.
- On shutdown, the conversion underway finishes; the rest wait for the next sweep.

## Tests

The package's specs run on mocks, with no database. In your app's tests, swap in `MemoryStorageService`, which keeps files in a `Map`, so nothing touches the disk and there's no temp directory to clean up:

```ts
import { MemoryStorageService, STORAGE_SERVICE } from '@repo/media';

const storage = new MemoryStorageService();
const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(STORAGE_SERVICE)
    .useValue(storage)
    .compile();

// storage.files maps each path to its bytes
```

Its urls are `/uploads/<path>`, as on the local disk, but `serveLocalMedia()` doesn't serve them.
