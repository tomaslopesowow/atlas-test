# @repo/notifications: a guide for agents

Notifications for a NestJS app on TypeORM and Postgres: an inbox per recipient, mail and push, delivered in the background with retries, and channels and providers an app adds itself. This file is enough to use the package without reading its source: everything listed is public API, and anything else is internal. `README.md` goes deeper. Where the repo has `apps/api`, it shows the package wired into an app.

## Rules

- **Stack:** NestJS 12, TypeORM 1.1 on Postgres, class-validator.
  - Node ≥ 26.1, the first with `crypto.randomUUIDv7()`.
  - The app's tsconfig sets `experimentalDecorators`, `emitDecoratorMetadata` and `useDefineForClassFields: false`, as Nest needs.
- **Independent:** the package imports no other `@repo/*` package. The app combines it with others.
- **No `forRoot()`:** import `NotificationsModule` wherever you send or read notifications. It exports `NotificationService` and `DevicesService`. The app's own channels and providers are found by their decorators, in any module's `providers`.
- **One object parameter** for every service method, even for one value: `notificationService.unreadCount({ modelType: 'user', modelId: 5 })`.
- **A model is a `ModelRef`:** `{ modelType, modelId }`, passed as flat fields in every method input.
  - `modelType` is the entity's **table name** (`@Entity('user')` → `'user'`), and `modelId` its integer `id`.
  - Write one helper per entity, e.g. `const userRef = (id: number) => ({ modelType: 'user', modelId: id })`.
- **No foreign key reaches a notification or a device.** When the app deletes a model, call `notificationService.deleteForModel(ref)`.
- **Tables:** `notification` (one row per recipient, with a UUIDv7 key) and `device`.
  - They're exported as `NOTIFICATIONS_ENTITIES`, for a data source that lists its entities, as the TypeORM CLI's must.
  - A change to them needs a migration in the app.
- **Config** comes from the environment and is validated at boot: a missing or invalid variable stops the app, listing every problem. Inject it with `@Inject(notificationsConfig.KEY)`.
- **Background delivery** runs in every instance:
  - a sweep at boot, every minute, and after every send;
  - safe with several instances;
  - call `app.enableShutdownHooks()`, so the batches being sent finish, and the SMTP pool closes, on SIGTERM.
- **Consumed from `dist`:** after changing the package, rebuild it with `./node_modules/.bin/tsc -p tsconfig.build.json` in this directory, or keep `pnpm dev` running.

| Env | |
| --- | --- |
| `NOTIFICATIONS_DEFAULT_LOCALE` | `en` |
| `NOTIFICATIONS_MAIL_PROVIDER` | `smtp`, or the name of your own `@MailProvider`. Unset turns mail off. |
| `MAIL_FROM` | Required with a mail provider |
| `SMTP_HOST`, `SMTP_PORT` (`587`), `SMTP_USER`, `SMTP_PASSWORD` | For `smtp`. Port 465 is implicit TLS; other ports need STARTTLS once there's a user. |
| `NOTIFICATIONS_PUSH_PROVIDERS` | Comma-separated, e.g. `expo`; the first is the default. Unset turns push off. |
| `EXPO_ACCESS_TOKEN` | Optional |

## Writing a notification

One class per kind of notification:

```ts
interface Liked {
    postId: number;
    name: string;
}

export class PostLikedNotification
    extends Notification<Liked>
    implements ToPush<Liked>, ToMail<Liked>
{
    readonly type = 'post.liked'; // stored on every row: keep it stable
    readonly channels = ['database', 'push', 'mail'];

    toPush({ payload }: RenderInput<Liked>) {
        return { title: 'New like', body: `${payload.name} liked your post` };
    }

    toMail({ payload }: RenderInput<Liked>) {
        return {
            subject: 'New like',
            text: `${payload.name} liked your post`,
            html: `<p>${escapeHtml(payload.name)} liked your post</p>`,
        };
    }
}
```

- **Channels:**
  - `'database'` puts the notification in the recipient's inbox, which needs an owner.
  - `'mail'` needs `toMail()` and the recipient's `email`.
  - `'push'` needs `toPush()`, an owner, and the owner's devices.
  - A recipient a channel can't reach is skipped.
- **`RenderInput`:** `{ id, recipient, payload, locale }`.
- **`MailContent`:** `subject` plus `html`, `text` or both. Escape user text in `html`; the package doesn't. `apps/api/src/notifications/escape-html.ts` is one way.
- **`PushMessage`:** `{ title, body, data?, sound?, badge?, priority?: 'normal' | 'high' }`. The channel adds `data.notificationId`.

## Sending

```ts
const { ids } = await this.notificationService.send({
    recipients: [{ ...userRef(5), email: 'ada@example.test', locale: 'nl' }],
    notification: new PostLikedNotification({ postId: 1, name: 'Ada' }),
});
```

- **Recipients** are `Notifiable`: `Partial<ModelRef> & { email?, locale? }`.
  - Give `modelType` and `modelId` both or neither; half an owner throws a `TypeError`.
  - A recipient by email alone gets no inbox and no push.
- **What `send()` does:** it renders and stores the rows in one transaction, then delivers in the background, at least once.
  - A notification listing an unknown channel throws before anything is stored.
- **Retries:** a failed delivery is tried again 1, 5, 30 and 120 minutes later, 5 attempts in all. `UndeliverableError` fails it at once.

## Inbox and devices

| Method | Input | Returns |
| --- | --- | --- |
| `list` | `ModelRef & { after?, limit? }` | `NotificationOutput[]`, newest first: 50 unless `limit` says otherwise. `after` is the last id of the previous page. |
| `unreadCount` | `ModelRef` | `number` |
| `markRead` | `ModelRef & { ids }` | `number` marked |
| `markAllRead` | `ModelRef` | `number` marked |
| `deleteForModel` | `ModelRef` | `{ notifications, devices }` deleted: every notification of the model, inbox or not, and its devices |
| `DevicesService.register` | `ModelRef & { token, provider? }` | `void`. A 400 when push is off, the provider isn't active, or the token isn't the provider's. A token moves to whoever registered it last. |
| `DevicesService.unregister` | `{ tokens }` | `number` |
| `DevicesService.unregisterFor` | `ModelRef` | `number` |
| `DevicesService.findFor` | `{ owners: ModelRef[] }` | `DeviceEntity[]` |

- **`NotificationOutput`:** `{ id, type, payload, readAt, createdAt }`.
- **DTOs for controllers:**
  - `InboxQueryInput`: `after` a UUIDv7, `limit` 1 to 100
  - `MarkReadInput`: at most 100 ids
  - `RegisterDeviceInput`: a token of at most 1024 characters
  - These limits hold only when input passes through the DTOs; the service methods don't check them.

## Your own channel or provider

Decorate a class in any module's `providers`; it is found at boot.

- **`@NotificationChannel('slack')`** implementing `INotificationChannel<TMessage>`:
  - `render({ notification, id, recipient, locale })` returns the message, or `null` to skip the recipient.
  - `send({ deliveries })` gets `{ notificationId, owner?, message }` items. It returns a `DeliveryResult[]` in the same order: `{ status: DeliveryStatus.Sent }`, `{ status: DeliveryStatus.Skipped }` or `{ status: DeliveryStatus.Failed, error }`.
  - The name `database` is taken.
- **`@PushProvider('apns')`** implementing `IPushProvider`:
  - `send({ pushes })` gets every push of a batch, as `{ token, message }`, and splits them into requests itself. It returns `{ invalidTokens, failures?: { index, error }[] }`.
  - If `send()` throws, all its pushes fail: they're retried, unless the error is an `UndeliverableError`.
  - The optional `isValidToken({ token })` lets `register()` refuse a foreign token.
  - Add its name to `NOTIFICATIONS_PUSH_PROVIDERS`.
- **`@MailProvider('postmark')`** implementing `IMailProvider`:
  - `send({ mail })`, where `mail` is `{ to, from, subject, html?, text? }`.
  - Select it with `NOTIFICATIONS_MAIL_PROVIDER`.
- **`UndeliverableError`:** throw it when retrying can't help, such as a rejected address or bad credentials.
- **Built in:**
  - the `mail` channel, with the `smtp` provider;
  - the `push` channel, with the `expo` provider, which also checks receipts and unregisters the devices Expo reports gone.

## In apps/api

- `src/notifications/*.notification.ts`: the notifications
- `src/inbox/inbox.controller.ts`: the inbox and device endpoints
- sends in `src/users/users.service.ts`, `src/posts/posts.service.ts`, `src/posts/comments.service.ts` and `src/roles/roles.service.ts`
- `UsersService.delete()`: `deleteForModel` when a user goes

## Testing

From this directory:

```sh
./node_modules/.bin/tsc --noEmit -p tsconfig.json && rm -rf .test-dist && ./node_modules/.bin/tsc -p tsconfig.test.json && TEST_DATABASE_URL=postgres://user:password@localhost:5432/db node --test --test-timeout=60000 ".test-dist/**/*.spec.js"
```

- **Postgres:** without `TEST_DATABASE_URL`, the Postgres spec is skipped. Each run makes a schema of its own.
- **In an app's unit tests:** swap in the fake with `overrideProvider(NotificationService).useValue(new FakeNotificationService())`.
  - `fake.sent` lists the sends.
  - `fake.sentOf({ notification: PostLikedNotification })` returns the sends of one class.
  - Only `send()` is faked.
- **Lint** from the repo root with `./node_modules/.bin/biome check packages/notifications`.
- Prefer these binaries over pnpm scripts, which check, and may reinstall, the whole workspace first.

## Gotchas

- **Keep `type` stable:** it's stored on every row. Renaming the class is fine; changing `type` orphans the old rows.
- **Deliveries are at least once:** a crash mid-send can deliver the same message twice.
- **A delivery that keeps failing is given up after about 2.6 hours of retries,** e.g. through a long SMTP or Expo outage.
- **Nest DI** reads constructor parameter types at runtime. Import injected classes as values, never with `import type`.
- **TypeORM 1.x throws on `undefined` or `null` in a `where`.** Build conditions with spreads, and match SQL NULL with `IsNull()`.
