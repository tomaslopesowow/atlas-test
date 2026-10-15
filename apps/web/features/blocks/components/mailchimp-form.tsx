import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import type { MailchimpForm } from '@/payload-types';
import { MailchimpFormClient } from './mailchimp-form.client';

defineBlockComponent({
    slug: 'mailchimp-form',
    component: ({ block }: { block: MailchimpForm }) => {
        return <MailchimpFormClient {...block} />;
    },
});
