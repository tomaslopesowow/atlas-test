/** Two days applied together as `fromName` and `toName` of the query string, keeping its `kept` parameters. */
export function DateRangeForm({
    kept,
    from,
    to,
    fromName = 'from',
    toName = 'to',
    required = false,
    className,
}: {
    kept: [string, string][];
    from?: string;
    to?: string;
    fromName?: string;
    toName?: string;
    required?: boolean;
    className: string;
}) {
    return (
        <form method="get" className={className}>
            {kept.map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
            ))}
            {(
                [
                    ['From', fromName, from],
                    ['To', toName, to],
                ] as const
            ).map(([label, name, value]) => (
                <label
                    key={name}
                    className="grid gap-1.5 text-xs text-muted-foreground"
                >
                    {label}
                    <input
                        type="date"
                        name={name}
                        defaultValue={value}
                        required={required}
                        className="input h-8"
                    />
                </label>
            ))}
            <button
                type="submit"
                className="btn btn-primary btn-sm col-span-full"
            >
                Apply
            </button>
        </form>
    );
}
