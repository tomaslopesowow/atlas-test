import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { XIcon } from './icons';

interface Option {
    value: string;
    label: string;
}

/** A text input listing `options` that match what is typed, or what `search` finds for it; submits the pick under `name`. */
export function Combobox({
    id,
    name,
    options,
    search,
    defaultValue = '',
    defaultLabel = '',
    labelName,
    clearable,
    invalid = false,
    describedBy,
    placeholder = 'Search…',
}: {
    id: string;
    name: string;
    options?: Option[];
    search?: (term: string) => Promise<Option[]>;
    defaultValue?: string;
    defaultLabel?: string;
    /** Also submits the label picked, under this name, so a refused submit can show it again. */
    labelName?: string;
    clearable: boolean;
    invalid?: boolean;
    describedBy?: string;
    placeholder?: string;
}) {
    const [picked, setPicked] = useState({
        value: defaultValue,
        label: defaultLabel,
    });
    const [text, setText] = useState(defaultLabel);
    const [found, setFound] = useState<Option[]>([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [loading, startLoading] = useTransition();
    const listId = useId();
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    // the term searched last, whose answer alone is shown, whatever order the answers arrive in
    const latest = useRef('');

    // the options for a term, the first of them highlighted for Enter when `first` is 0, none when -1
    const find = (term: string, first: number) => {
        setActive(first);

        if (options) {
            const lower = term.toLowerCase();

            setFound(
                options.filter(({ label }) =>
                    label.toLowerCase().includes(lower),
                ),
            );
            return;
        }

        // a server search waits for the typing to pause; Enter picks nothing of the term before
        setFound([]);
        clearTimeout(timer.current);
        latest.current = term;
        timer.current = setTimeout(
            () =>
                startLoading(async () => {
                    // a failed search finds nothing, rather than taking the form down with it
                    const answer = await search?.(term).catch(() => []);

                    if (latest.current === term) setFound(answer ?? []);
                }),
            200,
        );
    };

    useEffect(() => () => clearTimeout(timer.current), []);

    // a long list scrolls along with the arrow keys
    useEffect(() => {
        if (open)
            document
                .getElementById(`${listId}-${active}`)
                ?.scrollIntoView({ block: 'nearest' });
    }, [open, active, listId]);

    const choose = (option: Option | undefined) => {
        if (!option) return;

        setPicked(option);
        setText(option.label);
        setOpen(false);
    };

    return (
        <div className="relative">
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    role="combobox"
                    className={`input ${clearable && picked.value ? 'pr-9' : ''}`}
                    value={text}
                    placeholder={placeholder}
                    autoComplete="off"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    aria-activedescendant={
                        open && found[active]
                            ? `${listId}-${active}`
                            : undefined
                    }
                    // tabbing in only opens the list, so Enter still submits the form with what was picked
                    onFocus={() => {
                        setOpen(true);
                        find(text === picked.label ? '' : text, -1);
                    }}
                    onChange={(event) => {
                        setText(event.currentTarget.value);
                        setOpen(true);
                        find(event.currentTarget.value, 0);
                    }}
                    // the list's own clicks land before the blur closes it
                    onBlur={() =>
                        setTimeout(() => {
                            setOpen(false);
                            setText(picked.label);
                        }, 150)
                    }
                    onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setOpen(true);
                            setActive((i) => Math.min(i + 1, found.length - 1));
                        } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setActive((i) => Math.max(i - 1, 0));
                        } else if (
                            event.key === 'Enter' &&
                            open &&
                            (found[active] || text !== picked.label)
                        ) {
                            // a pick, or a search still being typed, rather than the form's submit
                            event.preventDefault();
                            choose(found[active]);
                        } else if (event.key === 'Escape') setOpen(false);
                    }}
                />
                {clearable && picked.value && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-icon absolute top-1/2 right-0.5 size-7 -translate-y-1/2 text-muted-foreground"
                        // keeps the input's focus, whose blur would put the cleared label back
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            setPicked({ value: '', label: '' });
                            setText('');
                        }}
                        aria-label="Clear"
                    >
                        <XIcon />
                    </button>
                )}
            </div>

            {open && (
                <div
                    id={listId}
                    role="listbox"
                    className="popover inset-x-0 mt-1 max-h-64 overflow-auto"
                >
                    {found.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {loading ? 'Searching…' : 'Nothing found'}
                        </div>
                    ) : (
                        found.map((option, i) => (
                            // biome-ignore lint/a11y/useKeyWithClickEvents: the input's arrow keys and Enter pick, as a combobox's do
                            <div
                                key={option.value}
                                tabIndex={-1}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                className="menu-item aria-selected:bg-accent"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => choose(option)}
                            >
                                {option.label}
                            </div>
                        ))
                    )}
                </div>
            )}

            <input type="hidden" name={name} value={picked.value} />
            {labelName && (
                <input type="hidden" name={labelName} value={picked.label} />
            )}
        </div>
    );
}
