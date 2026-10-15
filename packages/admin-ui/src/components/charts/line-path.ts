interface LinePoint {
    x: number;
    y: number;
}

const round = (n: number) => Number(n.toFixed(3));

/** The line through the points as an SVG path, monotone as d3's curveMonotoneX, so it never bulges past a peak or below zero. */
export function linePath(points: LinePoint[]): string {
    const [first] = points;

    if (!first) return '';

    // the slope of each segment, then a tangent at each point no steeper than its segments allow
    const slopes = points.slice(1).map((point, i) => {
        const before = points[i] as LinePoint;

        return (point.y - before.y) / (point.x - before.x || 1);
    });
    const tangents = points.map((_, i) => {
        const left = slopes[i - 1];
        const right = slopes[i];

        if (left === undefined) return right ?? 0;
        if (right === undefined) return left;
        // a peak, a dip or a flat stretch is level there
        if (left * right <= 0) return 0;

        return (2 * left * right) / (left + right);
    });

    return points.slice(1).reduce(
        (path, point, i) => {
            const before = points[i] as LinePoint;
            const third = (point.x - before.x) / 3;
            const from = before.y + (tangents[i] ?? 0) * third;
            const to = point.y - (tangents[i + 1] ?? 0) * third;

            return `${path} C ${round(before.x + third)} ${round(from)} ${round(point.x - third)} ${round(to)} ${round(point.x)} ${round(point.y)}`;
        },
        `M ${round(first.x)} ${round(first.y)}`,
    );
}
