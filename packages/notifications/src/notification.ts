import type {
    MailContent,
    MaybePromise,
    PushMessage,
    RenderInput,
} from './types/types.js';

/** Extended once per kind of notification, and built with the payload it is about. */
export abstract class Notification<TPayload extends object = object> {
    /** Stored on the row, so it has to outlive a rename of the class, e.g. `'invoice.paid'`. */
    abstract readonly type: string;

    /** The channels it goes through; `'database'` puts it in the recipient's inbox. */
    abstract readonly channels: readonly string[];

    constructor(readonly payload: TPayload) {}
}

/** Implemented by a notification that goes through the push channel. */
export interface ToPush<TPayload extends object = object> {
    toPush(input: RenderInput<TPayload>): MaybePromise<PushMessage>;
}

/** Implemented by a notification that goes through the mail channel. */
export interface ToMail<TPayload extends object = object> {
    toMail(input: RenderInput<TPayload>): MaybePromise<MailContent>;
}
