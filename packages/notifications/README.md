# @repo/notifications

Notifications for NestJS + TypeORM (Postgres). Every notification is stored as a row first, then sent through the channels it lists: `database` (the inbox), `push` (Expo built in), `mail` (SMTP built in), or one of your own.

## Setup

```ts
import { NotificationsModule } from '@repo/notifications';

@Module({
    imports: [
        ConfigModule.forRoot(),
        // or list NotificationEntity and DeviceEntity yourself, and add them to your migrations
        TypeOrmModule.forRoot({ /* ... */ autoLoadEntities: true }),
        NotificationsModule,
    ],
})
export class AppModule {}
```

Copy [.env.example](.env.example) into your `.env`. The variables are checked at boot, and the app won't start if one is missing or invalid.

| Variable | |
| --- | --- |
| `NOTIFICATIONS_DEFAULT_LOCALE` | Used when a recipient has no `locale`. Default `en`. |
| `NOTIFICATIONS_MAIL_PROVIDER` | `smtp`, or the name of your own `@MailProvider()`. Leave it unset to turn mail off. |
| `MAIL_FROM` | Required when mail is on. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | For `smtp`. Port 465 uses TLS from the start; any other port upgrades with STARTTLS. |
| `NOTIFICATIONS_PUSH_PROVIDERS` | Comma-separated, e.g. `expo,apns`. The first one is the default for devices. Leave it unset to turn push off. |
| `EXPO_ACCESS_TOKEN` | Only needed when push security is on in your Expo project. |

## Writing a notification

```ts
import { Notification, type RenderInput, type ToMail, type ToPush } from '@repo/notifications';

interface InvoicePaid {
    invoiceId: number;
    amount: string;
}

export class InvoicePaidNotification
    extends Notification<InvoicePaid>
    implements ToPush<InvoicePaid>, ToMail<InvoicePaid>
{
    // stored on the row, so never rename it
    readonly type = 'invoice.paid';
    readonly channels = ['database', 'push', 'mail'];

    toPush({ payload }: RenderInput<InvoicePaid>) {
        return { title: 'Invoice paid', body: `€${payload.amount} received`, sound: 'default' };
    }

    toMail({ payload, locale }: RenderInput<InvoicePaid>) {
        return {
            subject: 'Invoice paid',
            html: `<p>€${payload.amount} received</p>`,
            text: `€${payload.amount} received`,
        };
    }
}
```

- If a notification lists `push`, it must implement `toPush()`. If it lists `mail`, it must implement `toMail()`.
- `RenderInput` gives you `{ id, recipient, payload, locale }`.
- `toMail()` returns a `subject` plus `html`, `text`, or both. If you have HTML, send a text version too: spam filters score HTML-only mail higher.
- A push can also set `data`, `badge` and `priority`. Its `data.notificationId` is always set, so the app can open the notification.

## Sending

```ts
constructor(private readonly notificationService: NotificationService) {}

const { ids } = await this.notificationService.send({
    recipients: [{ modelType: 'user', modelId: user.id, email: user.email, locale: user.locale }],
    notification: new InvoicePaidNotification({ invoiceId: 7, amount: '49.00' }),
});
```

- What a recipient gets depends on what you give it:
  - With an owner (`modelType` + `modelId`), it gets the inbox and push.
  - With an `email`, it gets mail.
  - A recipient with just an `email` gets mail only.
  - If a channel can't reach a recipient, it skips them.
- `send()` stores the rows in a single transaction and returns their ids. Delivery happens in the background after that.
- A failed delivery is retried, up to 3 attempts in total. A sweep runs at boot and every minute after, picking up deliveries that are still pending and attempts that stopped more than 5 minutes ago, for example after a restart.
- Delivery is at-least-once: if a crash happens mid-send, a recipient can get the same message twice.

## Devices

```ts
constructor(private readonly devicesService: DevicesService) {}

// provider defaults to the first one in NOTIFICATIONS_PUSH_PROVIDERS
await this.devicesService.register({ owner: { modelType: 'user', modelId: user.id }, token, provider: 'expo' });
await this.devicesService.unregister({ tokens: [token] });
```

A token belongs to one owner, so registering it again moves it to the new owner. Tokens that a provider rejects are removed automatically. To validate request bodies, use `RegisterDeviceInput`.

## Inbox

```ts
const owner = { modelType: 'user', modelId: user.id };

await this.notificationService.list({ owner, after, limit }); // newest first; after = last id of the previous page
await this.notificationService.unreadCount({ owner });
await this.notificationService.markRead({ owner, ids });
await this.notificationService.markAllRead({ owner });
```

Only notifications that list `database` show up in the inbox. For controllers, use `InboxQueryInput` and `MarkReadInput` to validate input and `NotificationOutput` for responses.

## Your own providers and channels

Decorate the class and add it to the `providers` of any module. There is no `forRoot()`: the package finds these classes by their decorator.

Throw an `UndeliverableError` when retrying can't help, such as a rejected address. The delivery then fails right away instead of being retried. Any other error counts as temporary, and the delivery is retried.

**Push provider:** add its name to `NOTIFICATIONS_PUSH_PROVIDERS`.

```ts
@Injectable()
@PushProvider('apns')
export class ApnsPushProvider implements IPushProvider {
    readonly batchSize = 100; // pushes per request, default 100
    readonly concurrency = 10; // requests at once, default 10

    async send({ pushes }: PushSendInput): Promise<PushSendOutput> {
        // pushes[i] is { token, message }
        return {
            invalidTokens: [], // tokens to remove
            failures: [], // { index, error } per refused push
        };
    }
}
```

**Mail provider:** set `NOTIFICATIONS_MAIL_PROVIDER` to its name.

```ts
@Injectable()
@MailProvider('postmark')
export class PostmarkMailProvider implements IMailProvider {
    async send({ mail: { from, to, subject, html, text } }: MailSendInput): Promise<void> {
        // html or text can be undefined, but never both
    }
}
```

**Channel:** a notification uses it by listing its name. A channel can't be named `database`.

```ts
interface SlackMessage {
    text: string;
}

@Injectable()
@NotificationChannel('slack')
export class SlackChannel implements INotificationChannel<SlackMessage> {
    // runs inside send(); return null to skip this recipient
    render({ notification, recipient, locale }: ChannelRenderInput): SlackMessage | null {
        return { text: `New ${notification.type}` };
    }

    // one result per delivery, in the same order
    async send({ deliveries }: ChannelSendInput<SlackMessage>): Promise<DeliveryResult[]> {
        return deliveries.map(() => ({ status: DeliveryStatus.Sent }));
    }
}
```

The rendered message is stored as JSON on the row and sent later, possibly by a different process, so keep it plain data.
