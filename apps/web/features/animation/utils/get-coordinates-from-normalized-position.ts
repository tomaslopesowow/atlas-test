/**
 * World coordinate bounds for mapping normalized positions.
 * - Latitude: -60° to +60° (covers most inhabited areas)
 * - Longitude: -100° to +100° (covers most of the world)
 */
const LAT_MIN = -60;
const LAT_MAX = 60;
const LNG_MIN = -100;
const LNG_MAX = 100;

/**
 * Converts decimal degrees to DMS (degrees, minutes, seconds) format.
 */
function decimalToDMS(decimal: number, isLatitude: boolean): string {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = Math.floor((abs - degrees - minutes / 60) * 3600);
    const direction = isLatitude
        ? decimal >= 0
            ? 'N'
            : 'S'
        : decimal >= 0
          ? 'E'
          : 'W';

    return `${String(degrees).padStart(2, '0')}° ${String(minutes).padStart(2, '0')}' ${String(seconds).padStart(2, '0')}" ${direction}`;
}

/**
 * Generates a coordinate string from normalized x/y positions.
 *
 * Maps normalized screen coordinates to world coordinates:
 * - normalizedX = 0 → far West (100°W)
 * - normalizedX = 1 → far East (100°E)
 * - normalizedY = 0 → far North (60°N)
 * - normalizedY = 1 → far South (60°S)
 *
 * @param normalizedX - X position normalized to 0-1 (0 = West, 1 = East)
 * @param normalizedY - Y position normalized to 0-1 (0 = North, 1 = South)
 * @returns Formatted coordinate string like "[51° 42' 15" N 05° 38' 22" E]"
 */
export function getCoordinatesFromNormalizedPosition(
    normalizedX: number,
    normalizedY: number,
): string {
    const lat = LAT_MAX - normalizedY * (LAT_MAX - LAT_MIN);
    const lng = LNG_MIN + normalizedX * (LNG_MAX - LNG_MIN);

    const latDMS = decimalToDMS(lat, true);
    const lngDMS = decimalToDMS(lng, false);

    return `[${latDMS} ${lngDMS}]`;
}
