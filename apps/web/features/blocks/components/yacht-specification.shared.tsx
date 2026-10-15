import type { Yacht as DVDBYacht } from '@/features/payload/features/devoogt/utils/devoogtdb-client';
import type { Vessel as YatcoYacht } from '@/features/payload/features/yatco/utils/yatco-client';
import { Option, pipe } from 'effect';
import type { getTranslations } from 'next-intl/server';
import { getVesselDisplayLength } from '../../payload/features/yatco/utils/get-display-length';
import { getVesselDisplayGallonsToCubicMeters } from '../../payload/features/yatco/utils/get-display-capacity';
import type { ReactNode } from 'react';

export type SpecificationCategory =
    | 'design'
    | 'specifications'
    | 'propulsion'
    | 'refit';

type Translator = Awaited<
    ReturnType<typeof getTranslations<'YachtSpecifications'>>
>;

export interface YachtSpecificationDescriptor {
    category: SpecificationCategory;
    label: (t: Translator) => Option.Option<string>;
    deVoogtDB: (
        data: DVDBYacht,
        locale: string,
        t: Translator,
    ) => Option.Option<ReactNode>;
    yatco: (
        data: YatcoYacht,
        locale: string,
        t: Translator,
    ) => Option.Option<ReactNode>;
}

export interface YachtSpecificationLine {
    label: string;
    value: ReactNode;
    category: SpecificationCategory;
}

export const FLEET_DEFAULT_SPECIFICATIONS: YachtSpecificationDescriptor[] = [
    // --------------------------------------------------------------------------
    //  Design
    // --------------------------------------------------------------------------
    {
        category: 'design',
        label: (t) => Option.fromNullable(t('architect')),
        deVoogtDB: (data) => Option.fromNullable(data.architect),
        yatco: (data) => Option.fromNullable(data.HullDeck?.HullDesigner),
    },
    {
        category: 'design',
        label: (t) => Option.fromNullable(t('exteriorDesign')),
        deVoogtDB: (data) => Option.fromNullable(data.exteriordesign),
        yatco: (data) => Option.fromNullable(data.HullDeck?.ExteriorDesigner),
    },
    {
        category: 'design',
        label: (t) => Option.fromNullable(t('interiorDesign')),
        deVoogtDB: (data) => Option.fromNullable(data.interiordesign),
        yatco: (data) => Option.fromNullable(data.HullDeck?.InteriorDesigner),
    },

    // --------------------------------------------------------------------------
    //  Specifications
    // --------------------------------------------------------------------------
    {
        category: 'specifications',
        label: (t) => Option.fromNullable(t('length')),
        deVoogtDB: (data) => Option.fromNullable(data.readable_length),
        yatco: (data, locale) =>
            getVesselDisplayLength(
                data.Dimension?.Length,
                data.Dimension?.LengthUnitType,
                locale,
            ),
    },
    {
        category: 'specifications',
        label: (t) => Option.fromNullable(t('beam')),
        deVoogtDB: (data) => Option.fromNullable(data.readable_beam),
        yatco: (data, locale) =>
            getVesselDisplayLength(data.Dimension?.Beam, 2, locale),
    },
    {
        category: 'specifications',
        label: (t) => Option.fromNullable(t('draught')),
        deVoogtDB: (data) => Option.fromNullable(data.readable_draught),
        yatco: (data, locale) =>
            getVesselDisplayLength(data.Dimension?.MaxDraft, 2, locale),
    },

    // --------------------------------------------------------------------------
    //  Propulsion
    // --------------------------------------------------------------------------
    {
        category: 'propulsion',
        label: (t) => Option.fromNullable(t('engines')),
        deVoogtDB: (data) => Option.fromNullable(data.mainengines),
        yatco: (data) => {
            const engines = new Map<string, number>();
            for (const engine of data.Engines ?? []) {
                if (!engine.Model) continue;
                engines.set(engine.Model, (engines.get(engine.Model) ?? 0) + 1);
            }

            return Option.fromNullable(
                engines
                    .entries()
                    .map(([model, count]) =>
                        count > 1 ? `${count} x ${model}` : model,
                    )
                    .toArray()
                    .join('\n'),
            );
        },
    },
    {
        category: 'propulsion',
        label: (t) => Option.fromNullable(t('generators')),
        deVoogtDB: (data) => Option.fromNullable(data.generators),
        yatco: () => Option.none(),
    },
    {
        category: 'propulsion',
        label: (t) => Option.fromNullable(t('fuelCapacity')),
        deVoogtDB: (data) => Option.fromNullable(data.readable_fuelcapacity),
        yatco: (data, locale) =>
            pipe(
                Option.zipWith(
                    getVesselDisplayGallonsToCubicMeters(
                        data.Dimension?.FuelCapacity,
                        locale,
                    ),
                    Option.fromNullable(data.Dimension?.FuelCapacity),
                    (m, usg) => (
                        <span>
                            {m} m<sup>{3}</sup> / {usg} USG
                        </span>
                    ),
                ),
            ),
    },
    {
        category: 'propulsion',
        label: (t) => Option.fromNullable(t('waterCapacity')),
        deVoogtDB: (data) => Option.fromNullable(data.readable_watercapacity),
        yatco: (data) =>
            getVesselDisplayGallonsToCubicMeters(
                data.Dimension?.WaterCapacity,
            ).pipe(
                Option.map((value) => (
                    <span key={value}>
                        {value}m<sup>{3}</sup>
                    </span>
                )),
            ),
    },
    {
        category: 'propulsion',
        label: (t) => Option.fromNullable(t('range')),
        deVoogtDB: (data) => Option.fromNullable(data.readable_range),
        yatco: (data) =>
            pipe(
                Option.fromNullable(data.Dimension?.CruiseSpeedRange),
                Option.map((value) => `${value} NM`),
            ),
    },
];
