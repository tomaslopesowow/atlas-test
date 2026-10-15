import { type Ref, useId } from 'react';
import { dismiss } from './Dismiss';

/** Asks to delete `count` records, for good when `force`; opened with `showModal()`, it submits the form it sits in. */
export function DeleteDialog({
    ref,
    count,
    force,
    restorable,
}: {
    ref: Ref<HTMLDialogElement>;
    count: number;
    force: boolean;
    restorable: boolean;
}) {
    const id = useId();
    const label = force ? 'Delete for good' : 'Delete';

    return (
        <dialog
            ref={ref}
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-background p-6 text-foreground shadow-lg"
        >
            <h2 id={`${id}-title`} className="text-lg font-semibold">
                {label} {count === 1 ? 'this record' : `${count} records`}?
            </h2>
            <p
                id={`${id}-description`}
                className="mt-2 text-sm text-muted-foreground"
            >
                {restorable && !force
                    ? `${count === 1 ? 'It' : 'They'} can be restored afterwards.`
                    : 'This cannot be undone.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    className="btn btn-outline"
                    // first, so showModal() gives the safe choice the focus
                    onClick={(event) => {
                        const dialog = event.currentTarget.closest('dialog');

                        if (dialog) dismiss(dialog);
                    }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    name={force ? 'force' : undefined}
                    value={force ? 'true' : undefined}
                    className="btn btn-destructive"
                >
                    {label}
                </button>
            </div>
        </dialog>
    );
}
