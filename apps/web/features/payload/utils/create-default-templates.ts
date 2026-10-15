import type { Payload } from 'payload';
import { DEFAULT_PAGE_TEMPLATES } from '../collections/page-templates';

export async function createDefaultPageTemplates(payload: Payload) {
    payload.logger.info('Creating default page templates...');

    return Promise.all(
        DEFAULT_PAGE_TEMPLATES.map(async (template) => {
            const exists = !!(
                await payload.find({
                    collection: 'page-templates',
                    where: { title: { equals: template.title } },
                })
            )?.docs[0];

            if (exists) return Promise.resolve();

            payload.logger.info(
                `Creating page template "${template.title}"...`,
            );

            return payload.create({
                collection: 'page-templates',
                data: template,
            });
        }),
    );
}
