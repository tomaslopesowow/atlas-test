'use client';

import { CheckboxInput, FieldLabel, useField } from '@payloadcms/ui';
import type { JSONFieldClientComponent } from 'payload';
import { useCallback, useEffect, useState } from 'react';
import { fetchMergeFields } from '../utils/actions';
import type { ErrorResponse } from '@mailchimp/mailchimp_marketing';
import { PayloadLoader } from '../../ai-media-description/components/payload-loader';

type MergeField = {
    tag: string;
    name: string;
    required: boolean;
};

type MergeFieldsValue = Record<string, string | false>;

const isMergeFieldsResponseError = (
    response: Awaited<ReturnType<typeof fetchMergeFields>>,
): response is ErrorResponse => {
    if (!response) return true;
    return 'error' in response;
};

export const MailchimpMergeFieldsField: JSONFieldClientComponent = ({
    path,
    field,
}) => {
    const { value: mailchimpListId } = useField<string>({
        path: path.replace('mailchimpMergeFields', 'mailchimpListId'),
    });

    const { value, setValue } = useField<MergeFieldsValue>({ path });

    const [mergeFields, setMergeFields] = useState<MergeField[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!mailchimpListId) {
            setMergeFields(null);
            setError(null);
            return;
        }

        (async () => {
            setIsLoading(true);
            setError(null);
            const response = await fetchMergeFields(mailchimpListId);
            setIsLoading(false);

            if (isMergeFieldsResponseError(response)) {
                setError(response?.detail ?? 'Unknown error');
                setMergeFields(null);
                return;
            }

            setMergeFields(response ?? null);
        })();
    }, [mailchimpListId]);

    const toggleField = useCallback(
        (tag: string, label: string) => {
            const current = value ?? {};
            setValue({ ...current, [tag]: current[tag] ? false : label });
        },
        [value, setValue],
    );

    if (!mailchimpListId) {
        return null;
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', marginBottom: '2rem' }}>
                <PayloadLoader />
            </div>
        );
    }

    if (error) {
        return <ErrorMessage>{error}</ErrorMessage>;
    }

    if (!mergeFields?.length) {
        return <ErrorMessage>No merge fields found</ErrorMessage>;
    }

    return (
        <div
            style={{
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
            }}
        >
            <FieldLabel label={field.label} />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                }}
            >
                {mergeFields.map((mergeField) => (
                    <CheckboxInput
                        key={mergeField.tag}
                        checked={!!value?.[mergeField.tag]}
                        onToggle={() =>
                            toggleField(mergeField.tag, mergeField.name)
                        }
                        label={mergeField.name}
                    />
                ))}
            </div>
        </div>
    );
};

export default MailchimpMergeFieldsField;

const ErrorMessage = ({ children }: { children: React.ReactNode }) => {
    return <p style={{ color: 'red', marginBottom: '1rem' }}>{children}</p>;
};
