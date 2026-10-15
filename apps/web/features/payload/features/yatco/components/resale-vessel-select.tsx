import { SelectField } from '@payloadcms/ui';
import { Effect, pipe } from 'effect';
import get from 'lodash.get';
import type { SelectFieldServerComponent } from 'payload';
import type { ComponentProps } from 'react';
import { getPayloadClient } from '@/features/payload/client';
import { getYatcoClient } from '../utils/yatco-client';

export const YatcoResaleVesselSelect: SelectFieldServerComponent = async ({
    clientField,
    path,
    schemaPath,
    permissions,
    value: unsafeValue,
    data,
}) => {
    // Safely extract the value: use unsafeValue if it's a string, otherwise extract from nested data using the field path
    const value: string =
        typeof unsafeValue === 'string' ? unsafeValue : get(data, path);

    const payload = await getPayloadClient();

    // Initialize field props with default admin settings
    const fieldProps: ComponentProps<typeof SelectField> = {
        path,
        schemaPath,
        permissions,
        field: {
            ...clientField,
            type: 'select',
            options: [], // Start with empty options, will be populated from API
            admin: {
                isClearable: true,
                isSortable: false,
                placeholder: 'Select a reference vessel',
                ...clientField.admin, // Allow overrides from collection config
            },
        },
        value,
    };

    // Retrieve DeVoogtDB integration settings from global configuration
    const yatcoIntegration = (
        await payload.findGlobal({
            slug: 'integrations',
        })
    )?.yatco;

    // If API key is missing, render a disabled field with explanatory message
    if (!yatcoIntegration?.apiKey) {
        fieldProps.readOnly = true;
        // biome-ignore lint/style/noNonNullAssertion: we know the admin object is not null
        fieldProps.field.admin!.placeholder = 'Yatco API key is not set';
        return <SelectField {...fieldProps} />;
    }

    // Fetch fleet data using Effect for composable async operations and error handling
    const result = await pipe(
        Effect.promise(() => getYatcoClient(payload)),
        Effect.andThen((client) =>
            // Limit to 100 vessels as currently the database only features about 50 vessels
            // May need to upgrade this to a higher number if allowed, or
            // implement recursive pagination later if the database grows larger
            client.ForSale.Vessel.Search({ records: 100 }),
        ),
        Effect.runPromise,
    );

    if (result) {
        fieldProps.field.options = result.Results.map((vessel) => ({
            // Display format: "Name (ID)" or just "ID" if no name is available
            label: vessel.VesselName || String(vessel.VesselID),
            value: String(vessel.VesselID),
        })).sort((a, b) => {
            // Custom sort: push numeric-only labels (vessels without names) to the end
            const aIsNumber = /^\d+$/.test(a.label);
            const bIsNumber = /^\d+$/.test(b.label);
            if (aIsNumber && !bIsNumber) return 1; // a goes after b
            if (!aIsNumber && bIsNumber) return -1; // a goes before b
            // Both are same type (both numeric or both named), sort alphabetically
            return a.label.localeCompare(b.label);
        });
    }

    return <SelectField {...fieldProps} />;
};

export default YatcoResaleVesselSelect;
