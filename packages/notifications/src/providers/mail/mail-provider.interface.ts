import type { MailSendInput } from '../../types/types.js';

export interface IMailProvider {
    send(input: MailSendInput): Promise<void>;
}
