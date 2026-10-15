import type { ActionSchema } from '@repo/admin-contract';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { remove, restore } from '@/lib/actions';
import { runHref } from '@/lib/navigation';
import { DeleteDialog } from './DeleteDialog';
import { dismiss } from './Dismiss';
import { IconButton } from './IconButton';
import { TrashIcon } from './icons';
import { Select } from './Select';
import { useSelectedCount } from './TableControls';

/** Deletes, restores or runs an action on the rows checked, whose checkboxes name this form with `form`. */
export function BulkForm({
    id,
    resource,
    from,
    actions,
    softDeletes,
    trashed,
}: {
    id: string;
    resource: string;
    from: string;
    actions: ActionSchema[];
    softDeletes: boolean;
    trashed?: string;
}) {
    const navigate = useNavigate();
    const [action, setAction] = useState('');
    const chosen = actions.find(({ name }) => name === action);
    const dialog = useRef<HTMLDialogElement>(null);
    const selected = useSelectedCount(id);
    const [deleting, setDeleting] = useState({ count: 0, force: false });
    const checked = (form: HTMLFormElement | null) =>
        form ? new FormData(form).getAll('keys').map(String) : [];
    const showsDeleted =
        softDeletes && (trashed === 'with' || trashed === 'only');

    const deleteButton = (force: boolean) => (
        <IconButton
            label={force ? 'Delete for good' : 'Delete selected'}
            icon={<TrashIcon />}
            variant="destructive"
            align="end"
            disabled={selected === 0}
            onClick={(event) => {
                const count = checked(event.currentTarget.form).length;

                if (count === 0) return;

                setDeleting({ count, force });
                dialog.current?.showModal();
            }}
        />
    );

    return (
        <form
            id={id}
            className="flex flex-wrap items-center gap-2"
            action={remove.bind(null, resource)}
            onSubmit={(event) => {
                if (checked(event.currentTarget).length === 0)
                    event.preventDefault();
                // closed as it goes, so it does not stay open over the list, nor take a second click
                else if (dialog.current) dismiss(dialog.current);
            }}
        >
            {/* back to this very page, its filters and all, once the rows are deleted or refused */}
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="back" value={from} />
            {actions.length > 0 && (
                <>
                    {/* a standalone action runs on no rows; the others wait for some to be checked */}
                    <Select
                        label="Action"
                        placeholder="Action…"
                        options={actions.map(({ name, label, standalone }) => ({
                            value: name,
                            label,
                            disabled: !standalone && selected === 0,
                        }))}
                        onChange={setAction}
                        className="input h-8 w-52 text-sm"
                    />
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={
                            !chosen || (!chosen.standalone && selected === 0)
                        }
                        onClick={(event) => {
                            if (!chosen) return;

                            const keys = chosen.standalone
                                ? []
                                : checked(event.currentTarget.form);

                            if (chosen.standalone || keys.length > 0)
                                navigate(runHref(resource, action, keys, from));
                        }}
                    >
                        Run
                    </button>
                </>
            )}
            {showsDeleted && (
                <button
                    type="submit"
                    formAction={restore.bind(null, resource)}
                    className="btn btn-outline btn-sm"
                    disabled={selected === 0}
                >
                    Restore selected
                </button>
            )}
            {deleteButton(false)}
            {showsDeleted && deleteButton(true)}
            <DeleteDialog
                ref={dialog}
                count={deleting.count}
                force={deleting.force}
                restorable={softDeletes}
            />
        </form>
    );
}
