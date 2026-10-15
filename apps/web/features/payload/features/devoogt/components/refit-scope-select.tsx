import { SelectField } from '@payloadcms/ui';
import { Option, pipe, Schema } from 'effect';
import get from 'lodash.get';
import type { SelectFieldServerComponent } from 'payload';
import type { ComponentProps } from 'react';
import { Yacht } from '@/features/payload/features/devoogt/utils/devoogtdb-client';

export const DVDBRefitScopeSelect: SelectFieldServerComponent = async ({
    clientField,
    path,
    schemaPath,
    permissions,
    value: unsafeValue,
    data,
    collectionSlug,
}) => {
    if (collectionSlug !== 'pages' || data?.taxonomyType !== 'fleet') {
        return null;
    }

    // Safely extract the value: use unsafeValue if it's a string, otherwise extract from nested data using the field path
    const value: string =
        typeof unsafeValue === 'string' ? unsafeValue : get(data, path);

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
                placeholder: 'Select a refit year',
                ...clientField.admin, // Allow overrides from collection config
            },
        },
        value,
    };

    const refitScopes = pipe(
        data?.taxonomyData?.fleet?.deVoogtData,
        Schema.decodeUnknownOption(Yacht),
        Option.flatMap((yacht) => Option.fromNullable(yacht.refit_scopes)),
        Option.map((refitScopes) =>
            refitScopes.filter((x): x is NonNullable<typeof x> => x != null),
        ),
    );

    if (Option.isSome(refitScopes)) {
        fieldProps.field.options = refitScopes.value
            .map((scope, index) => ({
                // Display format: "Name (ID)" or just "ID" if no name is available
                label: [
                    scope.year,
                    Option.fromNullable(scope.scope?.slice(0, 100)).pipe(
                        Option.map((x) => `${x.trim()}...`),
                        Option.getOrNull,
                    ),
                ]
                    .filter(Boolean)
                    .join(' - ')
                    .trim(),
                value: String(index),
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

    return (
        <SelectField {...fieldProps} readOnly={clientField.admin?.readOnly} />
    );
};

export default DVDBRefitScopeSelect;
