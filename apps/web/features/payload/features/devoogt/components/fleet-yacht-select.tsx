import { SelectField } from '@payloadcms/ui';
import { Effect, pipe } from 'effect';
import get from 'lodash.get';
import type { SelectFieldServerComponent } from 'payload';
import type { ComponentProps } from 'react';
import { getDVDBClient } from '@/features/payload/features/devoogt/utils/devoogtdb-client';

/**
 * A server-side component that renders a select field for choosing a DeVoogtDB yacht reference.
 *
 * This component fetches yacht data from the DeVoogtDB API and populates a select field with
 * available yachts. The field becomes read-only if the DeVoogtDB API key is not configured.
 *
 * @param props - Standard Payload CMS select field server component props
 * @returns A configured SelectField component with yacht options or read-only state
 *
 * @example
 * ```tsx
 * // Used in a Payload collection field configuration:
 * {
 *   name: 'referenceYacht',
 *   type: 'select',
 *   admin: {
 *     components: {
 *       Field: DVDBYachtSelect
 *     }
 *   }
 * }
 * ```
 */
export const DVDBYachtSelect: SelectFieldServerComponent = async ({
    clientField,
    path,
    schemaPath,
    permissions,
    value: unsafeValue,
    data,
    ...props
}) => {
    // Safely extract the value: use unsafeValue if it's a string, otherwise extract from nested data using the field path
    const value: string =
        typeof unsafeValue === 'string' ? unsafeValue : get(data, path);

    const payload = props.req.payload;

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
                placeholder: 'Select a reference yacht',
                ...clientField.admin, // Allow overrides from collection config
            },
        },
        value,
    };

    // Retrieve DeVoogtDB integration settings from global configuration
    const dvdbIntegration = (
        await payload.findGlobal({
            slug: 'integrations',
        })
    )?.dvdb;

    // If API key is missing, render a disabled field with explanatory message
    if (!dvdbIntegration?.apiKey) {
        fieldProps.readOnly = true;
        // biome-ignore lint/style/noNonNullAssertion: we know the admin object is not null
        fieldProps.field.admin!.placeholder = 'DeVoogtDB API key is not set';
        return <SelectField {...fieldProps} />;
    }

    // Fetch fleet data using Effect for composable async operations and error handling
    const result = await pipe(
        Effect.promise(() => getDVDBClient(payload)),
        Effect.andThen((client) => client.FleetData.all()),
        Effect.runPromise,
    );

    if (result) {
        fieldProps.field.options = result
            .map((yacht) => ({
                // Display format: "Name (ID)" or just "ID" if no name is available
                label: yacht.launch_name
                    ? `${yacht.launch_name} (${yacht.hull})`
                    : String(yacht.hull),
                value: String(yacht.devoogt_id),
            }))
            .sort((a, b) => {
                // Custom sort: push numeric-only labels (yachts without names) to the end
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

export default DVDBYachtSelect;
