import { useState } from 'react';

/** A tooltip by the cursor over a chart, inside its `data-chart` element; left of the cursor past the middle, to stay in the card. */
export function useChartTooltip() {
    const [hover, setHover] = useState<{
        text: string;
        x: number;
        y: number;
        flip: boolean;
    }>();

    const show = (text: string) => (event: React.MouseEvent<Element>) => {
        const box = event.currentTarget
            .closest('[data-chart]')
            ?.getBoundingClientRect();

        if (box)
            setHover({
                text,
                x: event.clientX - box.left,
                y: event.clientY - box.top,
                flip: event.clientX - box.left > box.width / 2,
            });
    };

    const tooltip = hover && (
        <div
            role="tooltip"
            className="pointer-events-none absolute z-50 rounded-md bg-primary px-3 py-1.5 text-xs whitespace-nowrap text-primary-foreground shadow-md"
            style={{
                top: hover.y,
                left: hover.x,
                transform: hover.flip
                    ? 'translate(calc(-100% - 12px), -50%)'
                    : 'translate(12px, -50%)',
            }}
        >
            {hover.text}
        </div>
    );

    return { show, hide: () => setHover(undefined), tooltip };
}
