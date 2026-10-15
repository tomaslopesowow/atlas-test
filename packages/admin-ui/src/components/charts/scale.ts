/** The top of a scale marked at quarters: the largest value rounded up to a round number, with whole quarters for whole values. */
export function scaleTop(largest: number, whole: boolean) {
    if (largest <= 0) return 4;

    const power = 10 ** Math.floor(Math.log10(largest));

    return (
        [1, 2, 2.5, 4, 5, 6, 8, 10, 20, 25, 40]
            .map((step) => step * power)
            .find(
                (top) =>
                    top >= largest && (!whole || Number.isInteger(top / 4)),
            ) ?? largest
    );
}

export const totalOf = (points: { value: number }[]) =>
    points.reduce((sum, { value }) => sum + value, 0);
