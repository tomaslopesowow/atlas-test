'use client';

import { Button, ConfirmationModal, toast, useModal } from '@payloadcms/ui';
import { useActionState, useEffect, useRef } from 'react';
import {
    articleSeedTaskDispatch,
    type ArticleSeedTaskDispatchResult,
} from '../utils/actions';

const MODAL_SLUG = 'articlesSeed';
const INITIAL_FORM_STATE: ArticleSeedTaskDispatchResult = { success: false };

export default function ArticlesSeedButton() {
    const { openModal } = useModal();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(
        articleSeedTaskDispatch,
        INITIAL_FORM_STATE,
    );

    function handleSync() {
        formRef.current?.requestSubmit();
    }

    useEffect(() => {
        if (state.success && state.jobId) {
            toast.success(
                <div>
                    Seeding articles in the background...{' '}
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
                    Seed Articles
                </Button>
            </form>
            <ConfirmationModal
                heading="Seed Articles from CraftCMS"
                body="This will seed all articles from CraftCMS into Payload CMS. This process may take a while depending on the number of articles."
                modalSlug={MODAL_SLUG}
                onConfirm={handleSync}
            />
        </>
    );
}
