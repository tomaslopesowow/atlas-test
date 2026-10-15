'use client';

import Heading from '@/components/common/heading';
import type { MailchimpForm as MailchimpFormType } from '@/payload-types';
import { MailchimpForm as MailchimpFormComponent } from '@/components/common/mailchimp-form';
import { Diorama } from '@/features/animation/components/diorama';
import { ImageCMS } from '@/components/content/content-image';

export const MailchimpFormClient = ({
    backgroundImage,
    title,
    mailchimpMergeFields,
    submitButtonText,
    mailchimpListId,
    notice,
}: MailchimpFormType) => {
    const filteredFields = Object.fromEntries(
        Object.entries(mailchimpMergeFields ?? {}).filter(
            ([_, value]) => value,
        ),
    );

    return (
        <section className="flex items-center justify-center relative min-h-screen p-8 md:p-20">
            <Diorama className="absolute inset-0 w-full max-h-full">
                <ImageCMS
                    image={backgroundImage}
                    className="w-full h-full object-cover"
                />
            </Diorama>
            <div className="flex flex-col px-10 md:px-20 py-16 md:py-32 w-full max-w-2xl z-10 bg-white gap-y-16">
                <Heading
                    variant="heading-4"
                    className="uppercase text-center text-dark-blue"
                >
                    {title}
                </Heading>
                <MailchimpFormComponent
                    mergeFields={filteredFields}
                    mailchimpListId={mailchimpListId}
                    submitButtonText={submitButtonText}
                    notice={notice}
                />
            </div>
        </section>
    );
};
