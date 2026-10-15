import type { Yacht } from '@/features/payload/features/devoogt/utils/devoogtdb-client';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import type { Link, MediaImage } from '@/payload-types';
import type { Maybe } from './maybe';
import { Option, Schema } from 'effect';
import { Vessel } from '@/features/payload/features/yatco/utils/yatco-client';
import { getVesselDisplayLength } from '@/features/payload/features/yatco/utils/get-display-length';
import { formatMoneyWithoutDecimals } from './format-money-no-decimals';

export type FormattedFleetYacht = {
    id: Maybe<number>;
    title: Maybe<string>;
    cover: Maybe<MediaImage>;
    year: Maybe<Yacht['year']>;
    hull: Maybe<`#${string | number}`>;
    length: Maybe<Yacht['length']>;
    readableLength: Maybe<Yacht['readable_length']>;
    link: Maybe<Link>;
};

const isValidDeVoogtDataObject = (data: unknown): data is Partial<Yacht> => {
    if (!data) return false;
    return typeof data === 'object' && !Array.isArray(data);
};

export const formatFleetYacht = (
    yachtPage: PageWithGenericTaxonomies<'fleet'>,
): FormattedFleetYacht | null => {
    if (!yachtPage) return null;

    const fleetData = yachtPage.taxonomyData?.fleet;
    if (!fleetData) return null;

    const deVoogtDataObject = isValidDeVoogtDataObject(fleetData.deVoogtData)
        ? fleetData.deVoogtData
        : null;

    return {
        id: Number(fleetData.dvdbReferenceId),
        title: yachtPage.title,
        cover: fleetData.cover,
        year: deVoogtDataObject?.year,
        hull: deVoogtDataObject?.hull ? `#${deVoogtDataObject.hull}` : null,
        length: deVoogtDataObject?.length,
        readableLength: deVoogtDataObject?.readable_length,
        link: {
            type: 'internal' as const,
            relation: yachtPage,
        },
    };
};

export type FormattedResaleYacht = {
    id: Maybe<number>;
    title: Maybe<string>;
    cover: Maybe<MediaImage>;
    year: Maybe<number>;
    hull: Maybe<`#${string}`>;
    length: Maybe<number>;
    readableLength: Maybe<string | null>;
    price: Maybe<string | null>;
    link: Maybe<Link>;
};

export const formatResaleYacht = (
    page: PageWithGenericTaxonomies<'resale'>,
    locale: string,
): FormattedResaleYacht | null => {
    if (!page) return null;

    const resaleData = page.taxonomyData?.resale;
    if (!resaleData) return null;

    const vessel = Schema.decodeUnknownOption(Vessel)(
        resaleData.yatcoData,
    ).pipe(Option.getOrNull);

    if (!vessel) return null;

    const hullId = resaleData.hullId ?? vessel.Listing?.HullID;

    return {
        id: vessel.Info?.VesselID ?? null,
        title: vessel.Description?.VesselName ?? page.title,
        cover: resaleData.cover,
        year: vessel.Info?.YearBuilt ?? null,
        hull: hullId ? `#${hullId}` : null,
        length: vessel.Dimension?.Length ?? null,
        readableLength: getVesselDisplayLength(
            vessel.Dimension?.Length,
            vessel.Dimension?.LengthUnitType,
            locale,
        ).pipe(Option.getOrNull),
        price: formatMoneyWithoutDecimals(
            vessel.Listing?.AskingPrice,
            locale,
        ).pipe(Option.getOrNull),
        link: {
            type: 'internal' as const,
            relation: page,
        },
    };
};
