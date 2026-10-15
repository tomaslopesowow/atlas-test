import type {
    ChannelRenderInput,
    ChannelSendInput,
    DeliveryResult,
    MaybePromise,
} from '../types/types.js';

export interface INotificationChannel<TMessage extends object = object> {
    /** The message for one recipient, or null when nothing reaches them through this channel, which skips them. */
    render(input: ChannelRenderInput): MaybePromise<TMessage | null>;

    /** Sends a batch, resolving with what became of each delivery, by position. */
    send(input: ChannelSendInput<TMessage>): Promise<DeliveryResult[]>;
}
