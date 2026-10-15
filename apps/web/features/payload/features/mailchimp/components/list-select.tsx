import type { ErrorResponse } from '@mailchimp/mailchimp_marketing';
import { SelectField } from '@payloadcms/ui';
import type { SelectFieldServerComponent } from 'payload';
import type { ComponentProps } from 'react';
import { getPayloadClient } from '@/features/payload/client';
import { getMailchimpClient } from '../utils/mailchimp-client';

export const MailchimpListSelect: SelectFieldServerComponent = async ({
    clientField,
    path,
    schemaPath,
    permissions,
}) => {
    const payload = await getPayloadClient();

    const fieldProps: ComponentProps<typeof SelectField> = {
        path,
        schemaPath,
        permissions,
        field: {
            ...clientField,
            type: 'select',
            options: [],
            admin: {
                isClearable: true,
                isSortable: false,
                placeholder: 'Select a list',
                ...clientField.admin,
            },
        },
    };

    const mailchimpClient = await getMailchimpClient(payload);

    if (!mailchimpClient) {
        fieldProps.readOnly = true;
        // biome-ignore lint/style/noNonNullAssertion: we know the admin object is not null
        fieldProps.field.admin!.placeholder =
            'Mailchimp client is not available';
        return <SelectField {...fieldProps} />;
    }

    const lists = await mailchimpClient.lists.getAllLists().catch((error) => {
        return {
            type: 'unknown',
            title: 'Unknown error',
            status: 400,
            detail: error.message,
            instance: '',
        } as ErrorResponse;
    });

    if (!('lists' in lists)) {
        fieldProps.readOnly = true;
        // biome-ignore lint/style/noNonNullAssertion: we know the admin object is not null
        fieldProps.field.admin!.placeholder =
            lists.detail || 'Mailchimp lists are not available';
        return <SelectField {...fieldProps} />;
    }

    fieldProps.field.options = lists.lists.map((list) => ({
        value: list.id,
        label: list.name,
    }));

    return <SelectField {...fieldProps} />;
};

export default MailchimpListSelect;
