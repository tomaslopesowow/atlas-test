/**
 * How aggressively the near-duplicate gate drops overlapping topics:
 * - `off` — no semantic de-duplication (exact-key dedup still applies)
 * - `duplicates-only` — block repeats of an existing topic/page
 * - `strict` — also block near-duplicates that would cannibalise
 *
 * Defined here as a leaf type so both the settings layer (`load-settings`) and
 * the gate implementation (`near-duplicate-gate`) can share it without a cycle.
 */
export type DedupSensitivity = 'off' | 'duplicates-only' | 'strict';
