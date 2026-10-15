/*
  This file includes code adapted from the nodemailer-mailgun-transport project,
  licensed under the MIT License.

  Source: https://github.com/orliesaurus/nodemailer-mailgun-transport

  MIT License

  Copyright (c) 2014 Orlie Solusa

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

import formData from 'form-data';
import Mailgun from 'mailgun.js';
import type {
    MailgunMessageData,
    MessagesSendResult,
} from 'mailgun.js/definitions';

interface TransportOptions {
    url?: string;
    host?: string;
    protocol?: string;
    port?: number;
    auth: {
        api_key?: string;
        apiKey?: string;
        domain?: string;
    };
    timeout?: number;
}

const whitelist = [
    ['replyTo', 'h:Reply-To'],
    ['messageId', 'h:Message-Id'],
    [/^h:/],
    [/^v:/],
    ['from'],
    ['to'],
    ['cc'],
    ['bcc'],
    ['subject'],
    ['text'],
    ['template'],
    ['html'],
    ['attachment'],
    ['inline'],
    ['recipient-variables'],
    ['o:tag'],
    ['o:campaign'],
    ['o:dkim'],
    ['o:deliverytime'],
    ['o:testmode'],
    ['o:tracking'],
    ['o:tracking-clicks'],
    ['o:tracking-opens'],
    ['o:require-tls'],
    ['o:skip-verification'],
    ['X-Mailgun-Variables'],
] as const;

const applyKeyWhitelist = (mail: MailgunMessageData) =>
    Object.keys(mail).reduce<Record<string, string>>((acc, key) => {
        const targetKey = whitelist.reduce<string | null>(
            (result, [cond, target]) => {
                if (result) {
                    return result;
                }
                if (
                    (cond instanceof RegExp && cond.exec(key)) ||
                    cond === key
                ) {
                    return target || key;
                }
                return null;
            },
            null,
        );
        if (!targetKey || !mail[key]) {
            return acc;
        }
        acc[targetKey] = mail[key] as string;
        return acc;
    }, {});

const makeAllTextAddresses = (mail: MailgunMessageData) => {
    const keys = ['from', 'to', 'cc', 'bcc', 'replyTo'];
    const makeTextAddresses = (addresses: string | MailgunMessageData[]) => {
        if (!addresses) return;
        const validAddresses = [...addresses].filter(Boolean);
        const textAddresses = validAddresses.map((item) =>
            typeof item === 'string'
                ? item
                : item.address
                  ? item.name
                      ? `${item.name} <${item.address}>`
                      : item.address
                  : null,
        );
        return textAddresses.filter(Boolean).join();
    };
    const result = keys.reduce<Record<string, string>>((result, key) => {
        if (!mail[key]) return result;
        const textAddresses = makeTextAddresses([mail[key]] as
            | string
            | MailgunMessageData[]);
        if (!textAddresses) {
            return result;
        }
        result[key] = textAddresses;
        return result;
    }, {});
    return result;
};

const send =
    (mailgunSend: (mail: MailgunMessageData) => Promise<MessagesSendResult>) =>
    async (
        { data: mail }: { data: MailgunMessageData },
        callback: (
            error: Error | null,
            result?: MessagesSendResult & { messageId: string | undefined },
        ) => void,
    ) => {
        try {
            const addresses = makeAllTextAddresses(mail);
            const extendedMail = {
                ...mail,
                ...addresses,
                html: mail.html || '',
            };
            const whitelistedMail = applyKeyWhitelist(
                extendedMail,
            ) as MailgunMessageData;
            const result = await mailgunSend(whitelistedMail);
            callback(null, { ...result, messageId: result.id });
        } catch (error) {
            callback(error as Error);
        }
    };

export const createMailgunTransport = (options: TransportOptions) => {
    const mailgun = new Mailgun(formData);
    let url = options.url;
    if (!options.url && options.host) {
        const generatedUrl = new URL(
            `https://${options.host || 'api.mailgun.net'}`,
        );
        generatedUrl.protocol = options.protocol || 'https:';
        generatedUrl.port = options.port?.toString() || '443';
        url = generatedUrl.href;
    }
    const messages = mailgun.client({
        username: 'api',
        key: options.auth.api_key || options.auth.apiKey || '',
        url,
        timeout: options.timeout,
    }).messages;

    const mailgunSend = (mail: MailgunMessageData) =>
        messages.create(options.auth.domain || '', mail);

    return {
        name: 'Mailgun',
        version: '1.0.0',
        send: send(mailgunSend),
        messages,
        options,
    };
};
