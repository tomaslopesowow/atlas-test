'use client';

import { Button, ConfirmationModal, toast, useModal } from '@payloadcms/ui';
import { useActionState, useEffect, useRef } from 'react';
import {
    pressEntrySeedTaskDispatch,
    type PressEntrySeedTaskDispatchResult,
} from '../utils/actions';

const MODAL_SLUG = 'pressEntriesSeed';
const INITIAL_FORM_STATE: PressEntrySeedTaskDispatchResult = { success: false };

export default function PressEntriesSeedButton() {
    const { openModal } = useModal();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(
        pressEntrySeedTaskDispatch,
        INITIAL_FORM_STATE,
    );

    function handleSync() {
        formRef.current?.requestSubmit();
    }

    useEffect(() => {
        if (state.success && state.jobId) {
            toast.success(
                <div>
                    Seeding press entries in the background...{' '}
                    <a href={`/admin/collections/payload-jobs/${state.jobId}`}>
                        View job
                    </a>
                </div>,
            );
        }
    }, [state]);

    return (
        <>
            <form ref={formRef} action={formAction}>
                <Button
                    buttonStyle="secondary"
                    size="small"
                    type="button"
                    onClick={() => openModal(MODAL_SLUG)}
                >
                    Seed Press Entries
                </Button>
            </form>
            <ConfirmationModal
                heading="Seed Press Entries from CraftCMS"
                body="This will seed all press entries from CraftCMS into Payload CMS. This process may take a while depending on the number of entries."
                modalSlug={MODAL_SLUG}
                onConfirm={handleSync}
            />
        </>
    );
}
