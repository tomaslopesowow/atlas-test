import type {
    CollectionConfig,
    CollectionSlug,
    Config,
    Field,
    GroupField,
    SelectField,
} from 'payload';

export interface TaxonomyPluginParams<TaxonomySlug extends string> {
    collection: CollectionSlug;
    taxonomies: Record<TaxonomySlug, Field[] | undefined>;
    inject?(
        collection: CollectionConfig,
        fields: { selectField: SelectField; dataField: GroupField },
    ): void;
}

export const taxonomyPlugin =
    <TaxonomySlug extends string>(params: TaxonomyPluginParams<TaxonomySlug>) =>
    (incomingConfig: Config): Config => {
        const config = { ...incomingConfig };

        const collection = config.collections?.find(
            (c) => c.slug === params.collection,
        );

        if (!collection) {
            throw new Error(`Collection "${params.collection}" not found`);
        }

        const validTaxonomies = Object.keys(params.taxonomies).filter(
            (key) => !!params.taxonomies[key as TaxonomySlug]?.length,
        );

        const selectField: SelectField = {
            name: 'taxonomyType',
            label: 'Taxonomy',
            type: 'select',
            options: validTaxonomies,
            admin: {
                condition: () => !!validTaxonomies.length,
                description:
                    'Select the content type. This will reveal specific fields for the selected type.',
            },
        };

        const taxonomyFields = Object.entries(
            params.taxonomies as Record<string, Field[]>,
        )
            .filter(([key]) => validTaxonomies.includes(key))
            .map(
                ([slug, fields]) =>
                    ({
                        name: slug,
                        type: 'group' as const,
                        fields,
                        admin: {
                            hideGutter: true,
                            condition: (data) => data?.taxonomyType === slug,
                        },
                    }) satisfies GroupField,
            );

        const dataField: GroupField = {
            name: 'taxonomyData',
            label: '',
            type: 'group',
            fields: taxonomyFields,
            admin: {
                condition: (data) => !!data?.taxonomyType,
            },
        };

        params.inject?.(collection, { selectField, dataField });

        // Define the hooks if they don't exist
        collection.hooks ??= {};

        // Add a clean-up hook to remove the taxonomy fields when the taxonomyType is removed or changed
        collection.hooks.beforeChange ??= [];
        collection.hooks.beforeChange.push(({ data }) => {
            // Only run on published documents
            if (data._status !== 'publish') return data;

            for (const key of Object.keys(data.taxonomyData ?? {})) {
                if (key === data.taxonomyType) continue;
                data.taxonomyData[key] = {};
            }

            return data;
        });

        return config;
    };
