/** The items in consecutive groups of at most `size`. */
export const chunk = <T>(items: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
        items.slice(i * size, (i + 1) * size),
    );

/** Runs `run` on every item, at most `limit` at once, starting the next as soon as one finishes. */
export const forEachLimited = async <T>(
    items: T[],
    limit: number,
    run: (item: T) => Promise<void>,
): Promise<void> => {
    // the runners share one iterator, so each item is taken exactly once
    const queue = items.values();

    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            for (const item of queue) await run(item);
        }),
    );
};
