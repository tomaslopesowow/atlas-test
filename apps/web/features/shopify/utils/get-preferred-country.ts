import type { CountryCode } from '@shopify/hydrogen-react/storefront-api-types';
import { cookies, headers } from 'next/headers';

export async function getPreferredCountry(
    defaultCountry: CountryCode,
): Promise<CountryCode> {
    return ((await cookies()).get('country')?.value ||
        (await headers()).get('country') ||
        defaultCountry) as CountryCode;
}
