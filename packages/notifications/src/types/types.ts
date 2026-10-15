import type { InboxQueryInput } from '../dto/inbox-query.input.js';
import type { MarkReadInput } from '../dto/mark-read.input.js';
import type { RegisterDeviceInput } from '../dto/register-device.input.js';
import type { Notification } from '../notification.js';

export type MaybePromise<T> = T | Promise<T>;

/** The model a notification or device belongs to; modelType is the entity's table name, e.g. `{ modelType: 'user', modelId: 5 }`. */
export interface ModelRef {
    modelType: string;
    modelId: number;
}

/** Who receives a notification; one without an owner is reached by address alone and has no inbox. */
export interface Notifiable extends Partial<ModelRef> {
    email?: string;
    locale?: string;
}

export interface PushMessage {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    /** `'default'`, or the name of a sound the app bundles; silent when unset. */
    sound?: string;
    /** The number on the app's icon. */
    badge?: number;
    priority?: 'normal' | 'high';
}

/** What a notification renders for a mail, with an html body, a text body or both; the channel adds who it goes to and from. */
export type MailContent = { subject: string } & (
    | { html: string; text?: string }
    | { html?: string; text: string }
);

export type MailMessage = MailContent & { to: string; from: string };

export enum DeliveryStatus {
    Pending = 'PENDING',
    Processing = 'PROCESSING',
    Sent = 'SENT',
    Failed = 'FAILED',
    Skipped = 'SKIPPED',
}

/** One channel's delivery of one notification, kept on its row so any process can resume it. */
export interface DeliveryState<TMessage extends object = object> {
    message: TMessage | null;
    status: DeliveryStatus;
    attempts: number;
    /** When the current attempt started, as an ISO string; how a stopped process's attempt is told apart. */
    startedAt?: string;
    /** When a PENDING delivery that failed is next tried, as an ISO string. */
    retryAt?: string;
}

export type Deliveries = Record<string, DeliveryState>;

/** What a notification renders a channel's message from. */
export interface RenderInput<TPayload extends object = object> {
    id: string;
    recipient: Notifiable;
    payload: TPayload;
    locale: string;
}

export interface ChannelRenderInput extends Omit<RenderInput, 'payload'> {
    notification: Notification;
}

/** One message of one notification, as a channel sends it. */
export interface Delivery<TMessage extends object = object> {
    notificationId: string;
    owner?: ModelRef;
    message: TMessage;
}

export type DeliveryResult =
    | { status: DeliveryStatus.Sent | DeliveryStatus.Skipped }
    | { status: DeliveryStatus.Failed; error: unknown };

export interface ChannelSendInput<TMessage extends object = object> {
    deliveries: Delivery<TMessage>[];
}

export interface PushSendInput {
    pushes: { token: string; message: PushMessage }[];
}

/** A push the service refused, by its index in `pushes`; an `UndeliverableError` when trying again cannot help. */
export interface PushFailure {
    index: number;
    error: unknown;
}

export interface PushSendOutput {
    invalidTokens: string[];
    failures?: PushFailure[];
}

export interface MailSendInput {
    mail: MailMessage;
}

export interface SendInput {
    recipients: Notifiable[];
    notification: Notification;
}

export interface SendOutput {
    ids: string[];
}

export interface OwnersInput {
    owners: ModelRef[];
}

export interface InboxListInput extends ModelRef, InboxQueryInput {}

export interface InboxMarkReadInput extends ModelRef, MarkReadInput {}

export interface DeviceRegisterInput extends ModelRef, RegisterDeviceInput {}

export interface TokenInput {
    token: string;
}

export interface TokensInput {
    tokens: string[];
}

export interface NameInput {
    name: string;
}
