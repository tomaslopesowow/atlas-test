import { cloneElement, type ReactElement, useId } from 'react';

const SIDES = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
};

const ALIGNS = {
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
};

/** A label shown on hover or focus of its one child, in plain CSS; hidden while a menu inside it is open. */
export function Tooltip({
    content,
    side = 'top',
    align = 'center',
    className = 'inline-flex',
    children,
}: {
    content: React.ReactNode;
    side?: keyof typeof SIDES;
    align?: keyof typeof ALIGNS;
    className?: string;
    children: ReactElement<{
        'aria-describedby'?: string;
        'aria-label'?: string;
    }>;
}) {
    const id = useId();

    return (
        <span className={`group/tooltip relative ${className}`}>
            {/* an icon button its label names already, rather than twice */}
            {children.props['aria-label']
                ? children
                : cloneElement(children, { 'aria-describedby': id })}
            <span
                id={id}
                role="tooltip"
                // out of the layout while hidden, so one by an edge never widens the page; fades as it shows
                className={`pointer-events-none absolute z-50 hidden rounded-md bg-primary px-3 py-1.5 text-xs whitespace-nowrap text-primary-foreground opacity-0 shadow-md transition-[opacity,display] transition-discrete group-focus-within/tooltip:block group-focus-within/tooltip:opacity-100 group-hover/tooltip:block group-hover/tooltip:opacity-100 group-hover/tooltip:delay-150 starting:opacity-0 group-has-[[open]]/tooltip:hidden! ${SIDES[side]} ${ALIGNS[align]}`}
            >
                {content}
            </span>
        </span>
    );
}
