import type { Payload } from 'payload';

export const getMailchimpClient = async (payload: Payload) => {
    const mailchimpIntegration = (
        await payload.findGlobal({
            slug: 'integrations',
        })
    )?.mailchimp;

    const mailchimpClient = await import('@mailchimp/mailchimp_marketing').then(
        (module) => {
            const apiKey = mailchimpIntegration?.apiKey;
            const server = mailchimpIntegration?.serverPrefix;

            if (!apiKey || !server) {
                return null;
            }

            module.default.setConfig({
                apiKey,
                server,
            });

            return module.default;
        },
    );

    return mailchimpClient;
};
