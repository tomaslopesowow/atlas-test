import { useRef } from 'react';
import { remove } from '@/lib/actions';
import { DeleteDialog } from './DeleteDialog';
import { dismiss } from './Dismiss';

export function DeleteForm({
    resource,
    recordKey,
    from,
    force = false,
    restorable = false,
}: {
    resource: string;
    recordKey: string;
    /** Where a refused delete comes back to, with its error. */
    from: string;
    force?: boolean;
    restorable?: boolean;
}) {
    const dialog = useRef<HTMLDialogElement>(null);

    return (
        <form
            action={remove.bind(null, resource)}
            // closed as it goes, so it does not stay open over the page it lands on, nor take a second click
            onSubmit={() => dialog.current && dismiss(dialog.current)}
        >
            <input type="hidden" name="from" value={from} />
            {/* back to the record only while it is still there to see: soft-deleted, not gone for good */}
            {restorable && !force && (
                <input type="hidden" name="back" value={from} />
            )}
            <input type="hidden" name="keys" value={recordKey} />
            <button
                type="button"
                className="btn btn-destructive"
                onClick={() => dialog.current?.showModal()}
            >
                {force ? 'Delete for good' : 'Delete'}
            </button>
            <DeleteDialog
                ref={dialog}
                count={1}
                force={force}
                restorable={restorable}
            />
        </form>
    );
}
