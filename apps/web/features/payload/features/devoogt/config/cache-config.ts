/** Cache TTL in milliseconds (1 hour) */
export const DEVOOGT_CACHE_TTL_MS = 60 * 60 * 1000;

export function isDeVoogtDataStale(
    fetchedAt: string | Date | null | undefined,
): boolean {
    if (!fetchedAt) return true;
    const ageMs = Date.now() - new Date(fetchedAt).getTime();
    return ageMs > DEVOOGT_CACHE_TTL_MS;
}
