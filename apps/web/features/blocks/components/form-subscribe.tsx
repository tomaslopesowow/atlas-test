import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { getPayloadClient } from '../../payload/client';
import { FormSubscribeClient } from './form-subscribe.client';

defineBlockComponent({
    slug: 'form-subscribe',
    component: async ({ block }) => {
        if (!block.mailchimpListId) return null;
        const _payload = await getPayloadClient();
        return (
            <div>
                <FormSubscribeClient mailchimpListId={block.mailchimpListId} />
            </div>
        );
    },
});
