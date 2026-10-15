/** Cache TTL in milliseconds (1 hour) */
export const YATCO_CACHE_TTL_MS = 60 * 60 * 1000;

export function isYatcoDataStale(
    fetchedAt: string | Date | null | undefined,
): boolean {
    if (!fetchedAt) return true;
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    return ageMs > YATCO_CACHE_TTL_MS;
}
