/** A donut's size in its own units: drawn in a 100 × 100 box, centred. */
export const DONUT = { outer: 45, inner: 31, corner: 1.25, gap: 2.4 };

const point = (radius: number, angle: number) =>
    `${(50 + radius * Math.sin(angle)).toFixed(3)} ${(50 - radius * Math.cos(angle)).toFixed(3)}`;

/** A donut slice's outline, radians clockwise from the top, inset so a round-joined stroke of twice the corner fills it out with rounded corners. */
export function slicePath({ from, to }: { from: number; to: number }): string {
    const { outer, inner, corner, gap } = DONUT;
    const outerRadius = outer - corner;
    const innerRadius = inner + corner;
    // a slice too thin for its insets shrinks to its middle, so it still shows as a sliver
    const edges = (radius: number) => {
        const inset = (gap / 2 + corner) / radius;
        const middle = (from + to) / 2;

        return to - from > inset * 2
            ? [from + inset, to - inset]
            : [middle, middle];
    };
    const [outerFrom, outerTo] = edges(outerRadius) as [number, number];
    const [innerFrom, innerTo] = edges(innerRadius) as [number, number];
    const large = (end: number, start: number) =>
        end - start > Math.PI ? 1 : 0;

    return [
        `M ${point(outerRadius, outerFrom)}`,
        `A ${outerRadius} ${outerRadius} 0 ${large(outerTo, outerFrom)} 1 ${point(outerRadius, outerTo)}`,
        `L ${point(innerRadius, innerTo)}`,
        `A ${innerRadius} ${innerRadius} 0 ${large(innerTo, innerFrom)} 0 ${point(innerRadius, innerFrom)}`,
        'Z',
    ].join(' ');
}
