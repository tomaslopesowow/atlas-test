import type {
    PushSendInput,
    PushSendOutput,
    TokenInput,
} from '../../types/types.js';

export interface IPushProvider {
    /** Whether the token is one of its own; when implemented, registering any other token is refused. */
    isValidToken?(input: TokenInput): boolean;

    /** Sends every push, in as many requests as it needs; a throw fails them all, to be tried again. */
    send(input: PushSendInput): Promise<PushSendOutput>;
}
