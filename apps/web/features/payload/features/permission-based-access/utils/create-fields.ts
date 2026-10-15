import type {
    CheckboxField,
    CollectionConfig,
    GlobalConfig,
    NamedGroupField,
} from 'payload';
/**
 * Creates a group field for permissions with predefined styling.
 *
 * @param options - The options for creating the permissions group.
 * @returns The configured group field object with associated admin styles.
 */
export const createPermissionsGroup = ({
    name,
    label,
    fields,
}: {
    name: string;
    label?: string;
    fields: CheckboxField[];
}): NamedGroupField => ({
    name,
    type: 'group',
    fields,
    label,
    admin: {
        style: {
            marginBottom: 'var(--spacing-field)',
            marginTop: 'var(--spacing-field)',
            paddingBottom: 'var(--spacing-field)',
        },
    },
});

/**
 * Creates a permission checkbox field with conditional admin features.
 *
 * For permissions such as 'readVersions' or 'readDrafts', this function adds a condition to display
 * the checkbox only if the associated collection or global configuration supports versions.
 *
 * @param name - The name of the permission checkbox.
 * @param collectionOrGlobal - Optional configuration for a collection or global, which may include a 'versions' property.
 * @returns The configured checkbox field with appropriate styling and conditional display.
 */
export const createPermissionCheckbox = (
    name: string,
    collectionOrGlobal?: CollectionConfig | GlobalConfig,
): CheckboxField => {
    // Initialize the checkbox field with basic styles for the admin interface.
    const field: CheckboxField = {
        name,
        type: 'checkbox',
        admin: {
            style: {
                marginBottom: 'calc(var(--base) * 0.1)',
            },
        },
    };

    // For version-related permissions ('readVersions' and 'readDrafts'),
    // add a condition to ensure the field is only rendered when versioning is enabled.
    if (name === 'readVersions' || name === 'readDrafts') {
        const admin = (field.admin ??= {});
        admin.condition = () => !!collectionOrGlobal?.versions;
    }

    return field;
};
