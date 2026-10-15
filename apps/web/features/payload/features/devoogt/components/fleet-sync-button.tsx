'use client';

import { Button, ConfirmationModal, toast, useModal } from '@payloadcms/ui';
import { useActionState, useEffect, useRef } from 'react';
import {
    type FleetSyncTaskDispatchResult,
    fleetSyncTaskDispatch,
} from '../utils/actions';

const MODAL_SLUG = 'syncDVDB';
const INITIAL_FORM_STATE: FleetSyncTaskDispatchResult = { success: false };

export default function SyncFleetButton() {
    const { openModal } = useModal();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(
        fleetSyncTaskDispatch,
        INITIAL_FORM_STATE,
    );

    function handleSync() {
        formRef.current?.requestSubmit();
    }

    useEffect(() => {
        if (state.success && state.jobId) {
            toast.success(
                <div>
                    Syncing De Voogt DB in the background...{' '}
                    <a href={`/admin/collections/payload-jobs/${state.jobId}`}>
                        View job
                    </a>
                </div>,
            );
        } else {
            toast.error(
                'message' in state
                    ? String(state.message)
                    : 'An error occurred',
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
                    Sync De Voogt DB
                </Button>
            </form>
            <ConfirmationModal
                heading="Sync De Voogt DB"
                body="This will only draft new pages for missing yachts. Updating yacht data should be done in De Voogt DB."
                modalSlug={MODAL_SLUG}
                onConfirm={handleSync}
            />
        </>
    );
}
