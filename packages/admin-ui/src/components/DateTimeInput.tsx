import { useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

// `2026-10-08T12:30` in the browser's time zone, as a datetime-local input shows it
const toLocal = (iso: string) => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) return '';

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** A moment edited in the browser's time zone and submitted as ISO, so the server stores what was meant whatever its zone. */
export function DateTimeInput({
    id,
    name,
    defaultValue,
    required,
    invalid,
    describedBy,
}: {
    id: string;
    name: string;
    defaultValue: string;
    required: boolean;
    invalid: boolean;
    describedBy?: string;
}) {
    const [iso, setIso] = useState(defaultValue);
    const [local, setLocal] = useState(() => toLocal(defaultValue));

    return (
        <>
            <input
                id={id}
                type="datetime-local"
                className="input"
                value={local}
                required={required}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                onChange={(event) => {
                    const { value } = event.currentTarget;

                    setLocal(value);
                    setIso(value ? new Date(value).toISOString() : '');
                }}
            />
            <input type="hidden" name={name} value={iso} />
        </>
    );
}
