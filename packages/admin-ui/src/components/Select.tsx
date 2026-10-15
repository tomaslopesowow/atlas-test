import { useRef, useState } from 'react';
import { dismiss } from './Dismiss';
import { CheckIcon, ChevronDownIcon } from './icons';

interface SelectItem {
    value: string;
    label: string;
    /** Shown greyed out, and passed over by the mouse and the arrow keys. */
    disabled?: boolean;
}

/** A dropdown drawn as the panel's popovers, rather than the browser's; `value` holds it to the page, e.g. its query string. */
export function Select({
    id,
    name,
    options,
    value: held,
    defaultValue = '',
    onChange,
    placeholder = 'Select…',
    label,
    labelledBy,
    invalid,
    describedBy,
    className = 'input',
    up = false,
}: {
    id?: string;
    name?: string;
    options: SelectItem[];
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    /** What it is, for a screen reader, when no label element names it. */
    label?: string;
    /** The id of the label element naming it, which cannot point at the button itself. */
    labelledBy?: string;
    invalid?: boolean;
    describedBy?: string;
    className?: string;
    /** Opens above its button, as one at the foot of a page must. */
    up?: boolean;
}) {
    const [own, setValue] = useState(defaultValue);
    const value = held ?? own;
    const details = useRef<HTMLDetailsElement>(null);
    const picked = options.find((option) => option.value === value);

    const optionsOf = () => [
        ...(details.current?.querySelectorAll<HTMLButtonElement>(
            '[role=option]:not(:disabled)',
        ) ?? []),
    ];

    // the picked option, or the first, takes the focus as the list opens; toggle fires once it shows
    const focusPicked = () => {
        const all = optionsOf();

        (
            all.find((option) => option.ariaSelected === 'true') ?? all[0]
        )?.focus();
    };

    const close = () => {
        if (details.current) dismiss(details.current);
        details.current?.querySelector('summary')?.focus();
    };

    const pick = (next: string) => {
        setValue(next);
        onChange?.(next);
        close();
    };

    const move = (event: React.KeyboardEvent) => {
        const all = optionsOf();
        const at = all.indexOf(document.activeElement as HTMLButtonElement);
        const to = {
            ArrowDown: Math.min(at + 1, all.length - 1),
            ArrowUp: Math.max(at - 1, 0),
            Home: 0,
            End: all.length - 1,
        }[event.key];

        if (to === undefined) return;

        event.preventDefault();
        all[to]?.focus();
    };

    return (
        <details
            ref={details}
            className="relative"
            onToggle={(event) => {
                if (event.currentTarget.open) focusPicked();
            }}
        >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a summary is its details' button, which the arrow keys also open */}
            <summary
                id={id}
                className={`${className} flex cursor-pointer items-center justify-between gap-2 select-none`}
                aria-haspopup="listbox"
                aria-label={label}
                aria-labelledby={labelledBy}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                onKeyDown={(event) => {
                    if (
                        (event.key === 'ArrowDown' ||
                            event.key === 'ArrowUp') &&
                        !details.current?.open
                    ) {
                        event.preventDefault();
                        if (details.current) details.current.open = true;
                    }
                }}
            >
                <span
                    className={`truncate ${picked ? '' : 'text-muted-foreground'}`}
                >
                    {picked?.label ?? placeholder}
                </span>
                <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
                    <ChevronDownIcon />
                </span>
            </summary>
            <div
                role="listbox"
                aria-label={label}
                aria-labelledby={labelledBy}
                className={`popover left-0 grid max-h-64 w-max min-w-full overflow-y-auto ${up ? 'bottom-full mt-0 mb-2' : ''}`}
                onKeyDown={move}
            >
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === value}
                        disabled={option.disabled}
                        className="menu-item justify-between whitespace-nowrap aria-selected:font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"
                        onClick={() => pick(option.value)}
                    >
                        {option.label}
                        {option.value === value && <CheckIcon />}
                    </button>
                ))}
            </div>
            {name !== undefined && (
                <input type="hidden" name={name} value={value} />
            )}
        </details>
    );
}
