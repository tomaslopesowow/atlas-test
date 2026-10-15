import { usePreference, writePreference } from '@/lib/preferences';
import {
    CheckIcon,
    MonitorIcon,
    MoonIcon,
    PlusIcon,
    SunIcon,
    ThemeIcon,
} from './icons';

type Theme = 'light' | 'dark' | 'system';

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
    { value: 'system', label: 'System', icon: <MonitorIcon /> },
];

const ACCENTS = [
    // the stylesheet's own, which differs by theme
    { value: null, label: 'Default', color: 'light-dark(#77767b, #f6f5f4)' },
    { value: '#adfa1d', label: 'Lime', color: '#adfa1d' },
    { value: '#38bdf8', label: 'Sky', color: '#38bdf8' },
    { value: '#a78bfa', label: 'Violet', color: '#a78bfa' },
    { value: '#fb7185', label: 'Rose', color: '#fb7185' },
    { value: '#fb923c', label: 'Orange', color: '#fb923c' },
];

const HEX = /^#[0-9a-f]{6}$/i;

// a dark check on a light colour, a light one on a dark colour; the default's is set by theme too
const checkOn = (hex: string) => {
    if (!HEX.test(hex)) return 'light-dark(#fafafa, #18181b)';

    const [r, g, b] = [1, 3, 5].map((at) =>
        Number.parseInt(hex.slice(at, at + 2), 16),
    ) as [number, number, number];

    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#18181b' : '#fafafa';
};

const SWATCH =
    'grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-popover transition-[box-shadow,scale] hover:scale-110 [&_svg]:size-3.5 [&_svg]:stroke-3';

/** The theme and the charts' accent, kept in this browser, which index.html applies again before the first paint. */
export function ThemeToggle() {
    const current = (usePreference('theme') ?? 'system') as Theme;
    const stored = usePreference('accent');
    const accent = stored && HEX.test(stored) ? stored : null;
    const custom = accent !== null && !ACCENTS.some((a) => a.value === accent);

    const pick = (value: Theme) => {
        const root = document.documentElement;

        root.classList.remove('light', 'dark');
        if (value !== 'system') root.classList.add(value);
        writePreference('theme', value === 'system' ? null : value);
    };

    // null is the default accent, which the stylesheet sets for each theme
    const pickAccent = (value: string | null) => {
        const { style } = document.documentElement;

        if (value) style.setProperty('--chart', value);
        else style.removeProperty('--chart');
        writePreference('accent', value);
    };

    return (
        <details className="relative">
            <summary className="btn btn-ghost btn-icon" aria-label="Appearance">
                <ThemeIcon />
            </summary>
            <div className="popover right-0 grid w-72 gap-4 p-4">
                <fieldset className="grid gap-2">
                    <legend className="pb-2 text-xs font-medium text-muted-foreground">
                        Theme
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                        {THEMES.map(({ value, label, icon }) => (
                            <button
                                key={value}
                                type="button"
                                className="grid justify-items-center gap-1.5 rounded-md border px-2 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-pressed:border-ring aria-pressed:bg-accent aria-pressed:text-foreground [&_svg]:size-4"
                                aria-pressed={value === current}
                                onClick={() => pick(value)}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <fieldset className="grid gap-2">
                    <legend className="pb-2 text-xs font-medium text-muted-foreground">
                        Accent
                    </legend>
                    <div className="flex justify-between">
                        {ACCENTS.map(({ value, label, color }) => (
                            <button
                                key={label}
                                type="button"
                                className={`${SWATCH} aria-pressed:ring-2 aria-pressed:ring-ring`}
                                style={{
                                    background: color,
                                    color: checkOn(color),
                                }}
                                aria-label={label}
                                aria-pressed={accent === value}
                                title={label}
                                onClick={() => pickAccent(value)}
                            >
                                {accent === value && <CheckIcon />}
                            </button>
                        ))}
                        <label
                            className={`${SWATCH} cursor-pointer has-focus-visible:ring-2 has-focus-visible:ring-ring ${custom ? 'ring-2 ring-ring' : 'border border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground'}`}
                            style={
                                custom
                                    ? {
                                          background: accent,
                                          color: checkOn(accent),
                                      }
                                    : undefined
                            }
                            title="Custom colour"
                        >
                            {custom ? <CheckIcon /> : <PlusIcon />}
                            <input
                                type="color"
                                className="sr-only"
                                aria-label="Custom accent"
                                value={accent ?? '#f6f5f4'}
                                onChange={(event) =>
                                    pickAccent(event.currentTarget.value)
                                }
                            />
                        </label>
                    </div>
                </fieldset>
            </div>
        </details>
    );
}
