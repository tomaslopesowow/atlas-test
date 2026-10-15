'use client';

import { Button } from '@/features/shadcn/ui/button';
import Input from '@/features/shadcn/ui/input';
import { MAILCHIMP_EMAIL_FIELD } from '@/utils/shared';
import { useTranslations } from 'next-intl';
import { type ComponentProps, useState } from 'react';
import { renderLexicalSimple } from '../content/render-lexical-simple';
import { cn } from '@/features/shadcn/utils/ui';

interface MailchimpFormProps extends ComponentProps<'form'> {
    mergeFields: Record<string, string>;
    mailchimpListId: string;
    submitButtonText: string;
    // biome-ignore lint/suspicious/noExplicitAny: TODO make this type safe
    notice: any;
}

type SubmitResponse = {
    success: boolean;
    error?: string;
    errorKey?: string;
    details?: {
        fieldErrors?: Record<string, string[]>;
    };
};

export const MailchimpForm = ({
    mergeFields,
    mailchimpListId,
    submitButtonText,
    notice,
    className,
    ...props
}: MailchimpFormProps) => {
    const t = useTranslations('MailchimpForm');
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);
        setFieldErrors({});
        setIsSuccess(false);

        const formData = new FormData(e.currentTarget);
        const requiredFields = Object.keys(mergeFields);

        const data: Record<string, string> = {};
        for (const key of requiredFields) {
            data[key] = formData.get(key)?.toString() ?? '';
        }
        const result = await fetch('/api/mailchimp-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requiredFields, data, mailchimpListId }),
        });

        const resultData: SubmitResponse = await result.json();

        if (resultData.success) {
            setIsSuccess(true);
            return;
        }

        // Handle field-level validation errors
        if (resultData.details?.fieldErrors) {
            const errors: Record<string, string> = {};
            for (const [field, _messages] of Object.entries(
                resultData.details.fieldErrors,
            )) {
                errors[field] = t(`fieldError.${field}`);
            }
            setFieldErrors(errors);
        }

        // Handle general errors
        if (resultData.errorKey) {
            setFormError(t(`formErrors.${resultData.errorKey}`));
        }
    };
    return (
        <form
            {...props}
            onSubmit={(event) => {
                props.onSubmit?.(event);
                handleSubmit(event);
            }}
            className={cn(
                'px-0 md:px-10 flex flex-col gap-y-8 items-center w-full',
                className,
            )}
        >
            {Object.entries(mergeFields).map(([key, value]) => (
                <div key={key} className="w-full flex flex-col items-start">
                    <label
                        className="text-sm text-dark-blue-secondary"
                        htmlFor={key}
                    >
                        {t.has(`mergeFields.${key}`)
                            ? t(`mergeFields.${key}`)
                            : value}
                    </label>
                    <Input
                        name={key}
                        type={
                            key === MAILCHIMP_EMAIL_FIELD.key ? 'email' : 'text'
                        }
                        className="w-full"
                        inputClassName="py-3 border-b focus:border-dark-blue border-secondary px-0 text-dark-blue"
                        hasError={!!fieldErrors[key]}
                        info={fieldErrors[key]}
                    />
                </div>
            ))}
            <Button
                variant="primary"
                type="submit"
                className="w-full md:w-fit bg-dark-blue text-white"
            >
                {submitButtonText}
            </Button>
            {formError && <p className="text-xs text-danger">{formError}</p>}
            {isSuccess && (
                <p className="text-xs text-success">{t('success')}</p>
            )}
            <p className="text-xs text-dark-blue-secondary text-center">
                {renderLexicalSimple(notice)}
            </p>
        </form>
    );
};
