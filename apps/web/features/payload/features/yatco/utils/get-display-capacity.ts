import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import { Option } from 'effect';

/**
 * Converts a capacity in US gallons to a formatted string in m³
 * @param capacity - The capacity in US gallons
 * @param locale - The locale to use for formatting
 * @returns The formatted capacity in m³
 */
export function getVesselDisplayGallonsToCubicMeters(
    capacity?: number | null,
    locale: string = I18N_DEFAULT_LOCALE,
): Option.Option<string> {
    if (capacity == null) {
        return Option.none();
    }

    // 1 US gallon = 0.00378541 m³
    // Typical Yatco capacities in US gallons (per context), display as m³
    const cubicMeters = capacity * 0.00378541;

    // Format to maximum 0 decimals (e.g., "154 m³")
    const numberFormat = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
    });

    const formatted = numberFormat.format(Math.round(cubicMeters)).toString();

    return Option.some(formatted);
}

/**
 * Converts a volume in liters to US gallons
 * @param liters - The volume in liters
 * @returns The equivalent volume in US gallons
 */
export function convertLitersToUSGallons(
    liters?: number | null,
): Option.Option<number> {
    if (liters == null) {
        return Option.none();
    }

    // 1 liter = 0.264172 US gallons
    const usGallons = Math.ceil(liters * 0.264172);
    return Option.some(usGallons);
}
