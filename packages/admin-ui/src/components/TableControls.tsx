import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePreference, writePreference } from '@/lib/preferences';
import { IconButton } from './IconButton';
import { CompactRowsIcon, RowsIcon } from './icons';

const boxes = (form: string, checked = '') =>
    document.querySelectorAll<HTMLInputElement>(
        `input[name="keys"][form="${form}"]${checked}`,
    );

export function SelectAll({ form }: { form: string }) {
    return (
        <input
            type="checkbox"
            className="checkbox"
            aria-label="Select all rows"
            onChange={(event) => {
                for (const box of boxes(form))
                    box.checked = event.currentTarget.checked;
            }}
        />
    );
}

/** How many row checkboxes of the form are checked, kept up to date as any changes. */
export function useSelectedCount(form: string) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        // after SelectAll's own handler, which React runs below the document
        const update = () => setCount(boxes(form, ':checked').length);

        document.addEventListener('change', update);

        return () => document.removeEventListener('change', update);
    }, [form]);

    return count;
}

export function SelectionCount({
    form,
    total,
}: {
    form: string;
    total: number;
}) {
    return (
        <>
            {useSelectedCount(form)} of {total} row(s) selected.
        </>
    );
}

export const useCompact = () => usePreference('density') === 'compact';

export function DensityToggle() {
    const compact = useCompact();

    return (
        <IconButton
            label="Compact rows"
            icon={compact ? <RowsIcon /> : <CompactRowsIcon />}
            variant="outline"
            className={compact ? 'bg-accent' : ''}
            aria-pressed={compact}
            onClick={() =>
                writePreference('density', compact ? null : 'compact')
            }
        />
    );
}

const SEARCH_DELAY = 400;

/** Searches a list once the typing pauses, or at once on Enter, from its first page. */
export function SearchInput({
    defaultValue,
    placeholder,
    label,
}: {
    defaultValue?: string;
    placeholder: string;
    label: string;
}) {
    const navigate = useNavigate();
    const input = useRef<HTMLInputElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    // the search the url has, as Back or a link sets it, unless one is typing it
    useEffect(() => {
        if (input.current && document.activeElement !== input.current)
            input.current.value = defaultValue ?? '';
    }, [defaultValue]);

    const search = (text: string) => {
        clearTimeout(timer.current);

        // the query as it is now, not as it was when the typing began, so a filter picked meanwhile stays
        const next = new URLSearchParams(window.location.search);

        if (text.trim()) next.set('search', text.trim());
        else next.delete('search');
        next.delete('page');

        // replaced, not pushed, so Back does not step through every pause in the typing
        navigate({ search: `?${next}` }, { replace: true });
    };

    return (
        <input
            ref={input}
            type="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            aria-label={label}
            className="input h-8 w-[150px] lg:w-[250px]"
            onChange={(event) => {
                const { value } = event.currentTarget;

                clearTimeout(timer.current);
                timer.current = setTimeout(() => search(value), SEARCH_DELAY);
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter') search(event.currentTarget.value);
            }}
        />
    );
}
