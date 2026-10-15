import type { Transporter, TransportOptions } from 'nodemailer';
import nodemailer from 'nodemailer';
import type SESTransport from 'nodemailer/lib/ses-transport';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export const createNodemailerTransport = async (): Promise<Transporter> => {
    return nodemailer.createTransport(await getNodemailerTransportOptions());
};

export const getNodemailerTransportOptions =
    async (): Promise<TransportOptions> => {
        const mailDriver = process.env.MAIL_DRIVER?.toLowerCase();

        switch (mailDriver) {
            case 'ses':
                return await getNodemailerSESTransportOptions();

            case 'smtp':
                return getNodemailerSMTPTransportOptions();

            default:
                throw `Mail driver "${mailDriver}" is not supported.`;
        }
    };

export const getNodemailerSESTransportOptions =
    async (): Promise<SESTransport.Options> => {
        const aws = await import('@aws-sdk/client-ses');

        return {
            SES: {
                aws,
                ses: new aws.SES({
                    region: process.env.SES_REGION,
                    credentials: {
                        accessKeyId: process.env.SES_ACCESS_KEY ?? '',
                        secretAccessKey: process.env.SES_SECRET_ACCES_KEY ?? '',
                    },
                }),
            },
        };
    };

export const getNodemailerSMTPTransportOptions = (): SMTPTransport.Options => ({
    host: process.env.MAIL_HOST,
    port: Number.parseInt(process.env.MAIL_PORT ?? '', 10),
    secure: process.env.MAIL_PORT === '465',
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});
