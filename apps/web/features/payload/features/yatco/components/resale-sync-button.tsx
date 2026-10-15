'use client';

import { Button, ConfirmationModal, toast, useModal } from '@payloadcms/ui';
import { useActionState, useEffect, useRef } from 'react';
import {
    type YatcoSyncTaskDispatchResult,
    yatcoSyncTaskDispatch,
} from '../utils/actions';

const MODAL_SLUG = 'syncYatcoResale';
const INITIAL_FORM_STATE: YatcoSyncTaskDispatchResult = { success: false };

export default function SyncFleetButton() {
    const { openModal } = useModal();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(
        yatcoSyncTaskDispatch,
        INITIAL_FORM_STATE,
    );

    function handleSync() {
        formRef.current?.requestSubmit();
    }

    useEffect(() => {
        if (state.success && state.jobId) {
            toast.success(
                <div>
                    Syncing Yatco in the background...{' '}
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
                    Sync Yatco Resale
                </Button>
            </form>
            <ConfirmationModal
                heading="Sync Yatco Resale"
                body="This will only draft new pages for missing resale vessels. Updating resale data should be done in Yatco's resale database"
                modalSlug={MODAL_SLUG}
                onConfirm={handleSync}
            />
        </>
    );
}
