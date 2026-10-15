import { Effect, ParseResult, pipe, Schema } from 'effect';
import type { Payload } from 'payload';
import { YATCO_FEADSHIP_BUILDER_ID } from '../shared';

/**
 * @docs https://api.yatco.com/
 * @param payloadd client
 * @returns Yatco client
 */
export const getYatcoClient = async (payload: Payload) => {
    const yatcoIntegration = (
        await payload.findGlobal({
            slug: 'integrations',
        })
    )?.yatco;

    type ExtractParams<Path extends string> =
        Path extends `${infer _Before}/{${infer Param}}${infer Rest}`
            ? { [K in Param]?: string } & ExtractParams<Rest>
            : // biome-ignore lint/complexity/noBannedTypes: needed for string type signature
              {};

    const endpoint =
        <Path extends string, Type extends Schema.Schema.AnyNoContext>(
            path: Path,
            type: Type,
            init: RequestInit = { method: 'GET' },
        ) =>
        async (
            args?: ExtractParams<Path>,
        ): Promise<Schema.Schema.Type<Type> | null> => {
            if (!yatcoIntegration?.apiKey || !yatcoIntegration?.baseUrl) {
                payload.logger.error('Yatco integration not configured');
                return null;
            }

            let finalPath = path as string;
            if (args) {
                for (const [key, value] of Object.entries(args)) {
                    finalPath = finalPath.replace(
                        `{${key}}`,
                        String(value || ''),
                    );
                }
            }

            const headers: HeadersInit = {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Basic ${yatcoIntegration.apiKey}`,
                ...init.headers,
            };

            const response = await fetch(
                new URL(finalPath, yatcoIntegration.baseUrl),
                {
                    ...init,
                    headers,
                },
            );

            if (!response.ok) {
                payload.logger.error(
                    `Error fetching ${path}: ${response.status} ${response.statusText}`,
                );

                return null;
            }

            const result = await response.json().catch((error) => {
                payload.logger.error(
                    `Error parsing JSON from ${path}: ${error.message}`,
                );
                return null;
            });

            if (result == null) {
                payload.logger.error(`No result for ${path}`);
                return null;
            }

            const parsed = pipe(
                Schema.decode(type, { onExcessProperty: 'preserve' })(result),
                Effect.catchAll((error) => {
                    payload.logger.error(
                        ParseResult.TreeFormatter.formatErrorSync(error),
                    );
                    return Effect.succeed(null);
                }),
                Effect.runPromise,
            );

            return parsed;
        };

    return {
        ForSale: {
            Engines: {
                byID: endpoint(
                    '/api/v1/ForSale/Vessel/{vesselId}/Engine/{engineId}',
                    VesselEngine,
                ),
            },
            Vessel: {
                Files: endpoint(
                    '/api/v1/forsale/ForSale/{vesselId}/File',
                    Schema.Any,
                ),
                byID: endpoint('/api/v1/ForSale/Vessel/{vesselId}', Vessel),
                Photo: {
                    Main: endpoint(
                        '/api/v1/forsale/Vessel/{vesselId}/Photo/Main',
                        Photo,
                    ),
                },
                Search: (params: VesselSearchParams = {}) =>
                    endpoint(
                        '/api/v1/ForSale/Vessel/Search',
                        Schema.Struct({
                            Results: Schema.Array(VesselSearchResult),
                            Count: Schema.Number,
                            Records: Schema.Number,
                            Offset: Schema.Number,
                        }),
                        {
                            method: 'POST',
                            body: JSON.stringify(
                                Schema.decodeSync(VesselSearchParams)({
                                    ...params,
                                    BuilderID: YATCO_FEADSHIP_BUILDER_ID,
                                }),
                            ),
                        },
                    )(),
            },
            VesselBrokers: {
                byVesselID: endpoint(
                    '/api/v1/ForSale/VesselBrokers/{vesselID}',
                    Schema.Array(BrokerDetails),
                ),
            },
            Gallery: endpoint(
                '/api/v1/forsale/Vessel/{vesselId}/Photo/Gallery',
                Schema.Array(Photo),
            ),
        },
    };
};

export type YatcoClient = Awaited<ReturnType<typeof getYatcoClient>>;

export type Photo = Schema.Schema.Type<typeof Photo>;
export const Photo = Schema.Struct({
    PhotoID: Schema.NullishOr(Schema.Number),
    CultureID: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    SortOrder: Schema.NullishOr(Schema.Number),
    Width: Schema.NullishOr(Schema.Number),
    Height: Schema.NullishOr(Schema.Number),
    OriginalSize: Schema.NullishOr(Schema.Number),
    PhotoCategory: Schema.NullishOr(Schema.Number),
    Caption: Schema.NullishOr(Schema.String),
    largeImageURL: Schema.NullishOr(Schema.String),
    mediumImageURL: Schema.NullishOr(Schema.String),
    smallImageURL: Schema.NullishOr(Schema.String),
    MimeType: Schema.NullishOr(Schema.String),
});

export type VesselSearchParams = Schema.Schema.Type<typeof VesselSearchParams>;
export const VesselSearchParams = Schema.Struct({
    VesselIDs: Schema.NullishOr(Schema.Any),
    MLSIDs: Schema.NullishOr(Schema.Any),
    VesselStatusList: Schema.NullishOr(Schema.Any),
    VesselStatus: Schema.NullishOr(Schema.Number),
    CountryID: Schema.NullishOr(Schema.Any),
    StateID: Schema.NullishOr(Schema.Any),
    StateList: Schema.NullishOr(Schema.Any),
    RegionID: Schema.NullishOr(Schema.Any),
    CompanyID: Schema.NullishOr(Schema.Any),
    CountryList: Schema.NullishOr(Schema.Any),
    ListingAgreementType: Schema.NullishOr(Schema.Number),
    LengthUnit: Schema.NullishOr(Schema.Number),
    CurrencyType: Schema.NullishOr(Schema.Number),
    SpeedUnit: Schema.NullishOr(Schema.Number),
    AccountID: Schema.NullishOr(Schema.Number),
    VolumeUnit: Schema.NullishOr(Schema.Number),
    WeightUnit: Schema.NullishOr(Schema.Number),
    ContactID: Schema.NullishOr(Schema.Number),
    ModificationTypeList: Schema.NullishOr(Schema.Any),
    MinClearance: Schema.NullishOr(Schema.Any),
    MaxClearance: Schema.NullishOr(Schema.Any),
    MinBeam: Schema.NullishOr(Schema.Any),
    MaxBeam: Schema.NullishOr(Schema.Any),
    MinSpeed: Schema.NullishOr(Schema.Any),
    MinFuelCapacity: Schema.NullishOr(Schema.Any),
    MinHeads: Schema.NullishOr(Schema.Any),
    MinWaterCapacity: Schema.NullishOr(Schema.Any),
    MinStaterooms: Schema.NullishOr(Schema.Any),
    MinSleeps: Schema.NullishOr(Schema.Any),
    MaxSleeps: Schema.NullishOr(Schema.Any),
    MainCategoryID: Schema.NullishOr(Schema.Any),
    SubCategoryID: Schema.NullishOr(Schema.Any),
    MainCategoryText: Schema.NullishOr(Schema.Any),
    ProductionTypeId: Schema.NullishOr(Schema.Any),
    SuperstructureMaterialID: Schema.NullishOr(Schema.Any),
    BuildStatus: Schema.NullishOr(Schema.Any),
    SubBuildStatus: Schema.NullishOr(Schema.Any),
    MinDraft: Schema.NullishOr(Schema.Any),
    MaxDraft: Schema.NullishOr(Schema.Any),
    EngineModel: Schema.NullishOr(Schema.Any),
    CruiseSpeedRange: Schema.NullishOr(Schema.Any),
    HullTypeId: Schema.NullishOr(Schema.Any),
    HullID: Schema.NullishOr(Schema.Any),
    HullMaterial: Schema.NullishOr(Schema.Any),
    HullConfiguration: Schema.NullishOr(Schema.Any),
    EngineFuelType: Schema.NullishOr(Schema.Any),
    NumberofEngines: Schema.NullishOr(Schema.Any),
    SailBoatIDList: Schema.NullishOr(Schema.Any),
    MotorBoatIDList: Schema.NullishOr(Schema.Any),
    Rigs: Schema.NullishOr(Schema.Any),
    EngineManufacturer: Schema.NullishOr(Schema.Any),
    BuilderIDList: Schema.NullishOr(Schema.Any),
    SoldDate: Schema.NullishOr(Schema.Any),
    ActiveDateFrom: Schema.NullishOr(Schema.Any),
    ModifiedDate: Schema.NullishOr(Schema.Any),
    PriceRange: Schema.Struct({
        start: Schema.NullishOr(Schema.Any),
        end: Schema.NullishOr(Schema.Any),
    }),
    LOA: Schema.Struct({
        start: Schema.NullishOr(Schema.Any),
        end: Schema.NullishOr(Schema.Any),
    }),
    Year: Schema.Struct({
        start: Schema.NullishOr(Schema.Any),
        end: Schema.NullishOr(Schema.Any),
    }),
    ModelYear: Schema.Struct({
        start: Schema.NullishOr(Schema.Any),
        end: Schema.NullishOr(Schema.Any),
    }),
    GrossTonnage: Schema.Struct({
        start: Schema.NullishOr(Schema.Any),
        end: Schema.NullishOr(Schema.Any),
    }),
    PriceRangeUSD_PreCalc: Schema.Struct({
        start: Schema.NullishOr(Schema.Any),
        end: Schema.NullishOr(Schema.Any),
    }),
    VesselName: Schema.NullishOr(Schema.Any),
    Builder: Schema.NullishOr(Schema.Any),
    BuilderExactMatch: Schema.NullishOr(Schema.Any),
    BuilderID: Schema.NullishOr(Schema.Number),
    Model: Schema.NullishOr(Schema.Any),
    BrokerageCompany: Schema.NullishOr(Schema.Any),
    BrokerName: Schema.NullishOr(Schema.Any),
    City: Schema.NullishOr(Schema.Any),
    Zip: Schema.NullishOr(Schema.Any),
    Keywords: Schema.NullishOr(Schema.Any),
    Sail: Schema.NullishOr(Schema.Any),
    Motor: Schema.NullishOr(Schema.Any),
    View_All: Schema.NullishOr(Schema.Any),
    Concept: Schema.NullishOr(Schema.Any),
    Fractional: Schema.NullishOr(Schema.Any),
    Commercial: Schema.NullishOr(Schema.Any),
    ForCharter: Schema.NullishOr(Schema.Any),
    Construction: Schema.NullishOr(Schema.Any),
    New: Schema.NullishOr(Schema.Any),
    Used: Schema.NullishOr(Schema.Any),
    Sold: Schema.NullishOr(Schema.Any),
    Open: Schema.NullishOr(Schema.Any),
    CompanyOnly: Schema.NullishOr(Schema.Any),
    Search_All: Schema.NullishOr(Schema.Any),
    SpecialOffer: Schema.NullishOr(Schema.Any),
    FactoryDemo: Schema.NullishOr(Schema.Any),
    TradeIn: Schema.NullishOr(Schema.Any),
    NewToMarket: Schema.NullishOr(Schema.Boolean),
    PriceChange: Schema.NullishOr(Schema.Boolean),
    FeaturedNotFirst: Schema.NullishOr(Schema.Boolean),
    BrokerID: Schema.NullishOr(Schema.Number),
    OfficeID: Schema.NullishOr(Schema.Number),
    MaxRecordAgeHours: Schema.NullishOr(Schema.Any),
    Condition: Schema.NullishOr(Schema.Number),
    VesselType: Schema.NullishOr(Schema.Number),
    ShowOnlyInclude: Schema.NullishOr(Schema.Number),
    TagsList: Schema.NullishOr(Schema.Any),
    offset: Schema.NullishOr(Schema.Number),
    records: Schema.NullishOr(Schema.Number),
    sortField: Schema.NullishOr(Schema.Any),
    sortDirection: Schema.NullishOr(Schema.Any),
    sortId: Schema.NullishOr(Schema.Number),
    ShowOnConsumer: Schema.NullishOr(Schema.Boolean),
    ShowOnPro: Schema.NullishOr(Schema.Boolean),
    CompanyTypeIDs: Schema.NullishOr(Schema.Any),
    TaxPaidID: Schema.NullishOr(Schema.Any),
    RefitYear: Schema.Struct({
        start: Schema.NullishOr(Schema.Any),
        end: Schema.NullishOr(Schema.Any),
    }),
}).pipe(Schema.partial);

export type HullDeck = Schema.Schema.Type<typeof HullDeck>;
export const HullDeck = Schema.NullishOr(
    Schema.Struct({
        DataSource: Schema.NullishOr(Schema.Number),
        VesselID: Schema.NullishOr(Schema.Number),
        HullID: Schema.NullishOr(Schema.String),
        HullMaterialID: Schema.NullishOr(Schema.Number),
        HullConfigurationID: Schema.NullishOr(Schema.Number),
        HullTypeId: Schema.NullishOr(Schema.Number),
        HullColor: Schema.NullishOr(Schema.String),
        HullDesigner: Schema.NullishOr(Schema.String),
        DeckMaterialID: Schema.NullishOr(Schema.Number),
        InteriorDesigner: Schema.NullishOr(Schema.String),
        ExteriorDesigner: Schema.NullishOr(Schema.String),
        SuperstructureMaterialID: Schema.NullishOr(Schema.Number),
    }),
);

export type VesselDescription = Schema.Schema.Type<typeof VesselDescription>;
export const VesselDescription = Schema.NullishOr(
    Schema.Struct({
        DataSource: Schema.NullishOr(Schema.Number),
        VesselID: Schema.NullishOr(Schema.Number),
        VesselName: Schema.NullishOr(Schema.String),
        CultureID: Schema.NullishOr(Schema.Number),
        CultureName: Schema.NullishOr(Schema.String),
        CultureShortName: Schema.NullishOr(Schema.String),
        VesselDescriptionShowingInstructions: Schema.NullishOr(Schema.String),
        VesselDescriptionBrokerTeaser: Schema.NullishOr(Schema.String),
        VesselDescriptionShortDescription: Schema.NullishOr(Schema.String),
        VesselDescriptionShortDescriptionStripped: Schema.NullishOr(
            Schema.String,
        ),
        VesselDescriptionInternalTeaser: Schema.NullishOr(Schema.String),
        Loading_ShortDescription: Schema.NullishOr(Schema.Boolean),
        Loading_MyWebSiteDescription: Schema.NullishOr(Schema.Boolean),
        Loading_YatcoDotComDescription: Schema.NullishOr(Schema.Boolean),
    }),
);

export type Accomodation = Schema.Schema.Type<typeof Accomodation>;
export const Accomodation = Schema.Struct({
    DataSource: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    StateRooms: Schema.NullishOr(Schema.Number),
    NumBerths: Schema.NullishOr(Schema.Number),
    NumSleeps: Schema.NullishOr(Schema.Number),
    NumCrewBerths: Schema.NullishOr(Schema.Number),
    NumCrewSleeps: Schema.NullishOr(Schema.Number),
    CaptainQuarters: Schema.NullishOr(Schema.Boolean),
    CaptainOnBoard: Schema.NullishOr(Schema.Boolean),
});

export type SearchEngineOptimization = Schema.Schema.Type<
    typeof SearchEngineOptimization
>;
export const SearchEngineOptimization = Schema.Struct({
    VesselID: Schema.NullishOr(Schema.Number),
});

export type VesselDimension = Schema.Schema.Type<typeof VesselDimension>;
export const VesselDimension = Schema.Struct({
    DataSource: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    LengthUnitType: Schema.NullishOr(Schema.Number),
    Length: Schema.NullishOr(Schema.Number),
    Beam: Schema.NullishOr(Schema.Number),
    MaxDraft: Schema.NullishOr(Schema.Number),
    WeightUnitType: Schema.NullishOr(Schema.Number),
    Weight: Schema.NullishOr(Schema.Number),
    GrossTonnage: Schema.NullishOr(Schema.Number),
    SpeedUnitType: Schema.NullishOr(Schema.Number),
    CruiseSpeed: Schema.NullishOr(Schema.Number),
    MaxSpeed: Schema.NullishOr(Schema.Number),
    CruiseSpeedRange: Schema.NullishOr(Schema.Number),
    MaxSpeedRange: Schema.NullishOr(Schema.Number),
    VolumeUnitType: Schema.NullishOr(Schema.Number),
    FuelCapacity: Schema.NullishOr(Schema.Number),
    WaterCapacity: Schema.NullishOr(Schema.Number),
});

export type VesselEngine = Schema.Schema.Type<typeof VesselEngine>;
export const VesselEngine = Schema.Struct({
    DataSource: Schema.NullishOr(Schema.Number),
    EngineID: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    ManufacturerID: Schema.NullishOr(Schema.Number),
    Model: Schema.NullishOr(Schema.String),
    FuelTypeID: Schema.NullishOr(Schema.Number),
    EngineTypeID: Schema.NullishOr(Schema.Number),
    HorsePower: Schema.NullishOr(Schema.Number),
    EngineNumber: Schema.NullishOr(Schema.Number),
});

export type VesselInfo = Schema.Schema.Type<typeof VesselInfo>;
export const VesselInfo = Schema.Struct({
    DataSource: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    BoatName: Schema.NullishOr(Schema.String),
    VesselType: Schema.NullishOr(Schema.Number),
    VesselCondition: Schema.NullishOr(Schema.Number),
    VesselStatus: Schema.NullishOr(Schema.Number),
    BuilderID: Schema.NullishOr(Schema.Number),
    YearBuilt: Schema.NullishOr(Schema.Number),
    ModelYear: Schema.NullishOr(Schema.Number),
    FlyBridge: Schema.NullishOr(Schema.Boolean),
    Cockpit: Schema.NullishOr(Schema.Boolean),
    Helipad: Schema.NullishOr(Schema.Boolean),
    MainCategoryID: Schema.NullishOr(Schema.Number),
    SubCategoryID: Schema.NullishOr(Schema.Number),
    YearFit: Schema.NullishOr(Schema.Number),
    RefitType: Schema.NullishOr(Schema.String),
    ClassISMCompliant: Schema.NullishOr(Schema.Number),
    ClassMCACompliant: Schema.NullishOr(Schema.Number),
    MainPhotoID: Schema.NullishOr(Schema.Number),
    ActiveDate: Schema.NullishOr(Schema.Date),
    ModifyDate: Schema.NullishOr(Schema.Date),
    Deleted: Schema.NullishOr(Schema.Boolean),
    ShowOnPro: Schema.NullishOr(Schema.Boolean),
    ShowOnConsumer: Schema.NullishOr(Schema.Boolean),
    ShowOnCompanySite: Schema.NullishOr(Schema.Boolean),
    ShowOnOtherCompaniesSites: Schema.NullishOr(Schema.Boolean),
    Concept: Schema.NullishOr(Schema.Boolean),
    OnOrder: Schema.NullishOr(Schema.Boolean),
    Commercial: Schema.NullishOr(Schema.Boolean),
    ForCharter: Schema.NullishOr(Schema.Boolean),
    Elevator: Schema.NullishOr(Schema.Boolean),
    HandicapAccessible: Schema.NullishOr(Schema.Boolean),
    MLSID: Schema.NullishOr(Schema.Number),
    ProductionTypeId: Schema.NullishOr(Schema.Number),
    LeadTime: Schema.NullishOr(Schema.Number),
    isComingFromBoatShowVessel: Schema.NullishOr(Schema.Boolean),
    VesselRating: Schema.NullishOr(Schema.Number),
    IsVesLengthGreaterThanEightyFeet: Schema.NullishOr(Schema.Boolean),
});

export type VesselListing = Schema.Schema.Type<typeof VesselListing>;
export const VesselListing = Schema.Struct({
    DataSource: Schema.NullishOr(Schema.Number),
    CompanyID: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    AskingPrice: Schema.NullishOr(Schema.Number),
    PriceOnApplication: Schema.NullishOr(Schema.Boolean),
    IsStartingPrice: Schema.NullishOr(Schema.Boolean),
    CurrencyID: Schema.NullishOr(Schema.Number),
    TaxPaidID: Schema.NullishOr(Schema.Number),
    Fractional: Schema.NullishOr(Schema.Boolean),
    AgreementTypeID: Schema.NullishOr(Schema.Number),
    OfficeID: Schema.NullishOr(Schema.Number),
    BrokerID: Schema.NullishOr(Schema.Number),
    AvailableCoBroker: Schema.NullishOr(Schema.Number),
    SoldSecret: Schema.NullishOr(Schema.Boolean),
    Flag: Schema.NullishOr(Schema.String),
    NotForSaleInUS: Schema.NullishOr(Schema.Boolean),
    ListingBrokerPercentage: Schema.NullishOr(Schema.Number),
    NewToMarket: Schema.NullishOr(Schema.Boolean),
    PriceChange: Schema.NullishOr(Schema.Boolean),
    VesselStatus: Schema.NullishOr(Schema.Number),
    HullID: Schema.NullishOr(Schema.String),
    AcceptsCrypto: Schema.NullishOr(Schema.Boolean),
});

export type Location = Schema.Schema.Type<typeof Location>;
export const Location = Schema.Struct({
    DataSource: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    Cruising: Schema.NullishOr(Schema.Boolean),
    CountryID: Schema.NullishOr(Schema.Number),
    LocationStateID: Schema.NullishOr(Schema.Number),
    LocationCountryID: Schema.NullishOr(Schema.Number),
    LocationCityID: Schema.NullishOr(Schema.Number),
    LocationCity: Schema.NullishOr(Schema.String),
    LocationCountry: Schema.NullishOr(Schema.String),
    LocationState: Schema.NullishOr(Schema.String),
});

export type Broker = Schema.Schema.Type<typeof Broker>;
export const Broker = Schema.Struct({
    RecID: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    BrokerID: Schema.NullishOr(Schema.Number),
    FirstName: Schema.NullishOr(Schema.String),
    LastName: Schema.NullishOr(Schema.String),
    Phone: Schema.NullishOr(Schema.String),
    Mobile: Schema.NullishOr(Schema.String),
    CompanyLogoURL: Schema.NullishOr(Schema.String),
    PhotoURL: Schema.NullishOr(Schema.String),
    Email: Schema.NullishOr(Schema.String),
    OfficeID: Schema.NullishOr(Schema.Number),
    ExternalBroker: Schema.NullishOr(Schema.Boolean),
    toString: Schema.NullishOr(Schema.String),
});

export type BrokerDetails = Schema.Schema.Type<typeof BrokerDetails>;
export const BrokerDetails = Schema.Struct({
    RecID: Schema.NullishOr(Schema.Number),
    VesselID: Schema.NullishOr(Schema.Number),
    BrokerID: Schema.NullishOr(Schema.Number),
    FirstName: Schema.NullishOr(Schema.String),
    LastName: Schema.NullishOr(Schema.String),
    FullName: Schema.NullishOr(Schema.String),
    OfficeName: Schema.NullishOr(Schema.String),
    YATCOID: Schema.NullishOr(Schema.Number),
});

export type ProjectInfo = Schema.Schema.Type<typeof ProjectInfo>;
export const ProjectInfo = Schema.Struct({
    BuilderModuleID: Schema.NullishOr(Schema.Number),
    LeadTime: Schema.NullishOr(Schema.Number),
});

export type Vessel = Schema.Schema.Type<typeof Vessel>;
export const Vessel = Schema.Struct({
    Description: VesselDescription,
    Accomodation: Schema.NullishOr(Accomodation),
    SearchEngineOptimization: Schema.NullishOr(SearchEngineOptimization),
    Dimension: Schema.NullishOr(VesselDimension),
    Engines: Schema.NullishOr(Schema.Array(VesselEngine)),
    HullDeck,
    Info: Schema.NullishOr(VesselInfo),
    Listing: Schema.NullishOr(VesselListing),
    Location: Schema.NullishOr(Location),
    Brokers: Schema.NullishOr(Schema.Array(Broker)),
    ProjectInfo: Schema.NullishOr(ProjectInfo),
});

/**
 * The result of a vessel search from the Yatco API.
 * Nested data is defined within this type, because it is not in line with the other types. For example, the Brokers array is defined within the VesselSearchResult type, but it does not match exactly the Broker type.
 */
export type VesselSearchResult = Schema.Schema.Type<typeof VesselSearchResult>;
export const VesselSearchResult = Schema.Struct({
    VesselID: Schema.NullishOr(Schema.Number),
    CompanyID: Schema.NullishOr(Schema.Number),
    MLSID: Schema.NullishOr(Schema.Number),
    VesselStatus: Schema.NullishOr(Schema.Number),
    VesselStatusText: Schema.NullishOr(Schema.String),
    VesselCondition: Schema.NullishOr(Schema.Number),
    VesselConditionText: Schema.NullishOr(Schema.String),
    Year: Schema.NullishOr(Schema.Number),
    MainPhotoID: Schema.NullishOr(Schema.Number),
    VesselType: Schema.NullishOr(Schema.Number),
    VesselTypeText: Schema.NullishOr(Schema.String),
    ModelYear: Schema.NullishOr(Schema.Number),
    YearBuilt: Schema.NullishOr(Schema.Number),
    MainCategoryID: Schema.NullishOr(Schema.Number),
    MainCategoryText: Schema.NullishOr(Schema.String),
    SubCategoryID: Schema.NullishOr(Schema.Number),
    SubCategoryText: Schema.NullishOr(Schema.String),
    StateRooms: Schema.NullishOr(Schema.Number),
    Sleeps: Schema.NullishOr(Schema.Number),
    TaxPaidID: Schema.NullishOr(Schema.Number),
    LOAFeet: Schema.NullishOr(Schema.Number),
    Length: Schema.NullishOr(Schema.Number),
    Beam: Schema.NullishOr(Schema.Number),
    MinDraft: Schema.NullishOr(Schema.Number),
    MaxDraft: Schema.NullishOr(Schema.Number),
    MSRPPrice: Schema.NullishOr(Schema.Number),
    MSRPPriceCurrencyID: Schema.NullishOr(Schema.Number),
    Buildername: Schema.NullishOr(Schema.String),
    BuilderID: Schema.NullishOr(Schema.Number),
    WeightUnitType: Schema.NullishOr(Schema.Number),
    LOAMeters: Schema.NullishOr(Schema.Number),
    BeamFeet: Schema.NullishOr(Schema.Number),
    BeamMeters: Schema.NullishOr(Schema.Number),
    DraftMinFeet: Schema.NullishOr(Schema.Number),
    DraftMinMeters: Schema.NullishOr(Schema.Number),
    DraftMaxFeet: Schema.NullishOr(Schema.Number),
    DraftMaxMeters: Schema.NullishOr(Schema.Number),
    GrossTonnage: Schema.NullishOr(Schema.Number),
    GrossTonnagePounds: Schema.NullishOr(Schema.Number),
    GrossTonnageConverted: Schema.NullishOr(Schema.Number),
    LengthUnit: Schema.NullishOr(Schema.Number),
    WeightUnit: Schema.NullishOr(Schema.Number),
    VolumeUnit: Schema.NullishOr(Schema.Number),
    tags: Schema.NullishOr(Schema.Array(Schema.Any)), // Could refine if type is know)n
    AskingPrice: Schema.NullishOr(Schema.Number),
    AskingPriceCurrency: Schema.NullishOr(Schema.Number),
    AskingPriceCurrencyText: Schema.NullishOr(Schema.String),
    PriceOnApplication: Schema.NullishOr(Schema.Boolean),
    IsStartingPrice: Schema.NullishOr(Schema.Boolean),
    VesselName: Schema.NullishOr(Schema.String),
    AskingPriceFormatted: Schema.NullishOr(Schema.String),
    AskingPriceFormattedNoCurrency: Schema.NullishOr(Schema.String),
    AskingPriceCompare: Schema.NullishOr(Schema.Number),
    MSRPPriceFormatted: Schema.NullishOr(Schema.String),
    MSRPPriceFormattedNoCurrency: Schema.NullishOr(Schema.String),
    BuilderName: Schema.NullishOr(Schema.String),
    BrokerTeaser: Schema.NullishOr(Schema.String),
    City: Schema.NullishOr(Schema.String),
    Cruising: Schema.NullishOr(Schema.Boolean),
    LocationCountryID: Schema.NullishOr(Schema.Number),
    LocationCountry: Schema.NullishOr(Schema.String),
    LocationStateID: Schema.NullishOr(Schema.Number),
    HullMaterial: Schema.NullishOr(Schema.String),
    HullMaterialID: Schema.NullishOr(Schema.Number),
    HasVideo: Schema.NullishOr(Schema.Boolean),
    LocationState: Schema.NullishOr(Schema.String),
    LocationCityID: Schema.NullishOr(Schema.Number),
    LocationCity: Schema.NullishOr(Schema.String),
    LocationSubRegionID: Schema.NullishOr(Schema.Number),
    LocationSubRegion: Schema.NullishOr(Schema.String),
    MainPhotoUrl: Schema.NullishOr(Schema.String),
    MainPhotoMedURL: Schema.NullishOr(Schema.String),
    Model: Schema.NullishOr(Schema.String),
    IsModel: Schema.NullishOr(Schema.Boolean),
    EventID: Schema.NullishOr(Schema.Number),
    SoldDate: Schema.NullishOr(Schema.Date),
    SoldPrice: Schema.NullishOr(Schema.String),
    SoldSecret: Schema.NullishOr(Schema.Boolean),
    ActiveDate: Schema.NullishOr(Schema.Date),
    ModifiedDate: Schema.NullishOr(Schema.Date),
    DaysOnMarket: Schema.NullishOr(Schema.Number),
    DaysTillExpiration: Schema.NullishOr(Schema.String),
    RecordAgeHours: Schema.NullishOr(Schema.Number),
    HistoryDate: Schema.NullishOr(Schema.String),
    BrokerList: Schema.NullishOr(
        Schema.Array(
            Schema.Struct({
                CompanyID: Schema.NullishOr(Schema.Number),
                OfficeID: Schema.NullishOr(Schema.Number),
                BrokerID: Schema.NullishOr(Schema.Number),
                BrokerName: Schema.NullishOr(Schema.String),
                BrokerPhone: Schema.NullishOr(Schema.String),
                BrokerEmail: Schema.NullishOr(Schema.String),
                BrokerMobile: Schema.NullishOr(Schema.String),
                BrokerPhotoUrlSmall: Schema.NullishOr(Schema.String),
                CompanyName: Schema.NullishOr(Schema.String),
                CompanyAddress1: Schema.NullishOr(Schema.String),
                CompanyAddress2: Schema.NullishOr(Schema.String),
                CompanyZip: Schema.NullishOr(Schema.String),
                CompanyPhotoUrl: Schema.NullishOr(Schema.String),
                VesselID: Schema.NullishOr(Schema.Number),
            }),
        ),
    ),
    AssistantList: Schema.NullishOr(Schema.Array(Schema.Any)), // Could refine if type is known
    DataSource: Schema.NullishOr(Schema.Number),
    Open: Schema.NullishOr(Schema.Boolean),
    AgreementTypeID: Schema.NullishOr(Schema.Number),
    SearchedLengthUnit: Schema.NullishOr(Schema.Number),
    SearchedCurrency: Schema.NullishOr(Schema.Number),
    SearchedVolumeUnit: Schema.NullishOr(Schema.Number),
    LoaFormat: Schema.NullishOr(Schema.String),
    MaxDraftFormat: Schema.NullishOr(Schema.String),
    MinDraftFormat: Schema.NullishOr(Schema.String),
    BeamFormat: Schema.NullishOr(Schema.String),
    AcceptsCrypto: Schema.NullishOr(Schema.Boolean),
    ShowOnCustomerSite: Schema.NullishOr(Schema.Boolean),
    ShowOnOurWebsite: Schema.NullishOr(Schema.Boolean),
    ShowOnThirdPartySite: Schema.NullishOr(Schema.Boolean),
    ShowOnPro: Schema.NullishOr(Schema.Boolean),
    ForCharter: Schema.NullishOr(Schema.Boolean),
    AskingPrices: Schema.NullishOr(
        Schema.Array(
            Schema.Struct({
                AskingPrice: Schema.NullishOr(Schema.Number),
                AskingPriceFormatted: Schema.NullishOr(Schema.String),
                AskingPriceUSD: Schema.NullishOr(Schema.String),
                CurrencyShort: Schema.NullishOr(Schema.String),
                CurrencyID: Schema.NullishOr(Schema.Number),
            }),
        ),
    ),
});
