import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import { Option } from 'effect';

export function getVesselDisplayLength(
    length?: number | null,
    unitType?: number | null,
    locale: string = I18N_DEFAULT_LOCALE,
): Option.Option<string> {
    if (length == null || unitType == null) {
        return Option.none();
    }

    const lengthMeterFormat = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'meter',
        unitDisplay: 'narrow',
    });

    const formatFeetAndInches = (totalFeet: number): string => {
        const feet = Math.floor(totalFeet);
        const inches = Math.round((totalFeet - feet) * 12);
        return `${feet}′${inches}″`;
    };

    let vesselLength = '';
    let feet: number | undefined, meters: number | undefined;

    if (unitType === 1) {
        // Length is in feet, convert to meters
        feet = length;
        meters = length * 0.3048;
    } else if (unitType === 2) {
        // Length is in meters, convert to feet
        meters = length;
        feet = length / 0.3048;
    } else {
        feet = undefined;
        meters = undefined;
    }

    if (feet != null && meters != null) {
        vesselLength = `${lengthMeterFormat.format(meters)} / ${formatFeetAndInches(feet)}`;
    }

    return Option.fromNullable(vesselLength);
}
