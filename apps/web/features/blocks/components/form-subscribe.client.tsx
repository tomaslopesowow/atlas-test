'use client';

import { useActionState } from 'react';
import { Button } from '../../shadcn/ui/button';
import {
    type MailchimpAddListMemberResult,
    mailchimpAddListMember,
} from './form-subscribe.actions';

export interface FormSubscribeClientProps {
    mailchimpListId: string;
}

const initialState: MailchimpAddListMemberResult = {
    success: false,
};

export const FormSubscribeClient = ({
    mailchimpListId,
}: FormSubscribeClientProps) => {
    const [state, formAction, isPending] = useActionState(
        mailchimpAddListMember,
        initialState,
    );

    return (
        <div>
            <pre>{JSON.stringify({ state, isPending }, null, 2)}</pre>
            <form action={formAction} className="flex gap-2">
                <input
                    type="hidden"
                    name="mailchimpListId"
                    value={mailchimpListId}
                />

                <input
                    type="email"
                    name="email_address"
                    className="border border-gray-500"
                />
                <Button type="submit">Subscribe</Button>
            </form>
        </div>
    );
};
