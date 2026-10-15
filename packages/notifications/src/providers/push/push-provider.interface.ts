import type { PushSendInput, PushSendOutput } from '../../types/types.js';

export interface IPushProvider {
    /** How many pushes one request may carry; 100 when unset. */
    readonly batchSize?: number;

    /** How many of its requests may run at once; 10 when unset. */
    readonly concurrency?: number;

    /** Sends the pushes, resolving with the tokens the service reports as no longer valid. */
    send(input: PushSendInput): Promise<PushSendOutput>;
}
