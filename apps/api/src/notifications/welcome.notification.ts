import {
    Notification,
    type RenderInput,
    type ToMail,
} from '@repo/notifications';
import { escapeHtml } from './escape-html.js';

interface Welcome {
    name: string;
}

export class WelcomeNotification
    extends Notification<Welcome>
    implements ToMail<Welcome>
{
    readonly type = 'user.welcome';
    // no push: a new account has no device yet
    readonly channels = ['database', 'mail'];

    toMail({ payload: { name } }: RenderInput<Welcome>) {
        return {
            subject: 'Welcome to Atlas',
            html: `<p>Hi ${escapeHtml(name)}, your account is ready.</p>`,
            text: `Hi ${name}, your account is ready.`,
        };
    }
}
