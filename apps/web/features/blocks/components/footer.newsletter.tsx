'use client';
import type { Footer } from '@/payload-types';
import { Heading } from '@/components/common/heading';
import { Button } from '@/features/shadcn/ui/button';
import { useState } from 'react';
import ArrowRight from '@/components/icons/arrow-right';
import {
    Sheet,
    SheetBody,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/features/shadcn/ui/sheet';
import { AnimatedHeading } from '@/features/animation/components/animated-heading';
import { StyledDivider } from '@/components/common/styled-divider';
import { MailchimpForm } from '@/components/common/mailchimp-form';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';

type FooterNewsletterProps = NonNullable<Footer['newsletter']>;

export function FooterNewsletter({
    title,
    buttonText,
    form,
}: FooterNewsletterProps) {
    const [modalOpen, setModalOpen] = useState(false);

    const handleClick = () => {
        setModalOpen(true);
    };

    const filteredFields = Object.fromEntries(
        Object.entries(form?.mailchimpMergeFields ?? {}).filter(
            ([_, value]) => value,
        ),
    );

    return (
        <>
            <div className="grid grid-cols-12">
                <div className="col-span-12 md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3 xl:col-span-6 xl:col-start-4">
                    <div className="flex flex-col gap-y-8">
                        <Heading
                            as="h3"
                            variant="heading-4"
                            className="text-center"
                        >
                            {title}
                        </Heading>
                        <Button
                            variant="secondary"
                            className="gap-x-3 mx-auto"
                            onClick={handleClick}
                        >
                            {buttonText}
                            <ArrowRight className="size-3" />
                        </Button>
                    </div>
                </div>
            </div>
            <Sheet open={modalOpen} onOpenChange={setModalOpen}>
                <SheetContent side="center">
                    <SheetHeader className="flex justify-between items-center border-none">
                        <SheetTitle className="sr-only">{title}</SheetTitle>
                        <SheetClose asChild></SheetClose>
                    </SheetHeader>
                    <SheetBody className="text-center pb-16 flex flex-col gap-y-6 items-center">
                        <AnimatedHeading
                            variant="heading-4"
                            state={modalOpen ? 'in' : 'out'}
                        >
                            {title}
                        </AnimatedHeading>
                        {form?.mailchimpListId &&
                            form?.submitButtonText &&
                            form?.notice && (
                                <div className="flex flex-col gap-y-12 items-center text-center">
                                    <p className="font-serif">
                                        {renderLexicalSimple(form?.description)}
                                    </p>
                                    <StyledDivider />
                                    <MailchimpForm
                                        mergeFields={filteredFields}
                                        mailchimpListId={form.mailchimpListId}
                                        submitButtonText={form.submitButtonText}
                                        notice={form.notice}
                                    />
                                </div>
                            )}
                    </SheetBody>
                </SheetContent>
            </Sheet>
        </>
    );
}
