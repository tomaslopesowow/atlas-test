import { Effect, ParseResult, pipe, Schema } from 'effect';
import type { Payload } from 'payload';

/**
 * @docs https://api.devoogtdb.nl/Swagger/index.html
 * @param payload Payload client
 * @returns DVDB client
 */
export const getDVDBClient = async (payload: Payload) => {
    const dvdbIntegration = (
        await payload.findGlobal({
            slug: 'integrations',
        })
    )?.dvdb;

    type ExtractParams<Path extends string> =
        Path extends `${infer _Before}/{${infer Param}}${infer Rest}`
            ? { [K in Param]?: string } & ExtractParams<Rest>
            : // biome-ignore lint/complexity/noBannedTypes: needed for string type signature
              {};

    const endpoint =
        <Path extends string, Type>(
            path: Path,
            type: Schema.Schema<Type>,
            init: RequestInit = { method: 'GET' },
        ) =>
        async (args?: ExtractParams<Path>): Promise<Type | null> => {
            if (!dvdbIntegration?.apiKey || !dvdbIntegration?.baseUrl) {
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
                'x-api-key': `${dvdbIntegration.apiKey}`,
                ...init.headers,
            };

            const response = await fetch(
                new URL(finalPath, dvdbIntegration.baseUrl),
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

            const parsed = pipe(
                Schema.decode(type)(result),
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
        FleetData: {
            all: endpoint('/api/FleetData', Schema.Array(Yacht)),
            DeVoogtID: endpoint('/api/FleetData/{deVoogtID}', Yacht),
        },
    };
};

export type Yacht = Schema.Schema.Type<typeof Yacht>;
export const Yacht = Schema.Struct({
    devoogt_id: Schema.Number,
    website_id: Schema.NullishOr(Schema.Number),
    feadship_website: Schema.NullishOr(Schema.Boolean),
    feadship_map: Schema.NullishOr(Schema.Boolean),
    feadship_heritage_member: Schema.NullishOr(Schema.Boolean),
    feadship_refit: Schema.NullishOr(Schema.Boolean),
    feadship_my_feadship_portal: Schema.NullishOr(Schema.Boolean),
    launch_name: Schema.NullishOr(Schema.String),
    current_name: Schema.NullishOr(Schema.String),
    previous_names: Schema.NullishOr(Schema.String),
    hull: Schema.NullishOr(Schema.Number),
    design_number: Schema.NullishOr(Schema.Number),
    builder: Schema.NullishOr(Schema.String),
    yard: Schema.NullishOr(Schema.String),
    year: Schema.NullishOr(Schema.Number),
    delivery: Schema.NullishOr(Schema.String),
    mmsi: Schema.NullishOr(Schema.Number),
    imo: Schema.NullishOr(Schema.Number),
    length: Schema.NullishOr(Schema.Number),
    beam: Schema.NullishOr(Schema.Number),
    draught: Schema.NullishOr(Schema.Number),
    depth: Schema.NullishOr(Schema.Number),
    gross_tonnage: Schema.NullishOr(Schema.Number),
    speed: Schema.NullishOr(Schema.Number),
    range: Schema.NullishOr(Schema.Number),
    architect: Schema.NullishOr(Schema.String),
    exteriordesign: Schema.NullishOr(Schema.String),
    interiordesign: Schema.NullishOr(Schema.String),
    mainengines: Schema.NullishOr(Schema.String),
    generators: Schema.NullishOr(Schema.String),
    thrusters: Schema.NullishOr(Schema.String),
    fuelcapacity_m3: Schema.NullishOr(Schema.Number),
    watercapacity_m3: Schema.NullishOr(Schema.Number),
    guests: Schema.NullishOr(Schema.Number),
    crew: Schema.NullishOr(Schema.Number),
    staterooms: Schema.NullishOr(Schema.Number),
    readable_length: Schema.NullishOr(Schema.String),
    readable_beam: Schema.NullishOr(Schema.String),
    readable_draught: Schema.NullishOr(Schema.String),
    readable_depth: Schema.NullishOr(Schema.String),
    readable_speed: Schema.NullishOr(Schema.String),
    readable_range: Schema.NullishOr(Schema.String),
    readable_fuelcapacity: Schema.NullishOr(Schema.String),
    readable_watercapacity: Schema.NullishOr(Schema.String),
    readable_guests: Schema.NullishOr(Schema.String),
    readable_crew: Schema.NullishOr(Schema.String),
    readable_staterooms: Schema.NullishOr(Schema.String),
    about: Schema.NullishOr(Schema.String),
    about_refit: Schema.NullishOr(Schema.String),
    refit_scopes: Schema.Array(
        Schema.NullishOr(
            Schema.Struct({
                year: Schema.NullishOr(Schema.Number),
                refit_yard: Schema.NullishOr(Schema.String),
                scope: Schema.NullishOr(Schema.String),
            }),
        ),
    ),
    ais_name: Schema.NullishOr(Schema.String),
    ais_callsign: Schema.NullishOr(Schema.String),
    ais_latitude: Schema.NullishOr(Schema.Number),
    ais_longitude: Schema.NullishOr(Schema.Number),
    ais_speed: Schema.NullishOr(Schema.Number),
    ais_course: Schema.NullishOr(Schema.Number),
    ais_heading: Schema.NullishOr(Schema.Number),
    ais_destination: Schema.NullishOr(Schema.String),
    ais_eta: Schema.NullishOr(Schema.String),
    ais_distance_remaining: Schema.NullishOr(Schema.Number),
    ais_time: Schema.NullishOr(Schema.String),
});
