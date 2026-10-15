import { CollectionBasicFragment } from '@/features/shopify/api/fragments/collection-basic.storefront';
import { getCollectionsBasic } from '@/features/shopify/api/get-collections-basic.admin';
import { SelectField } from '@payloadcms/ui';
import { type FragmentOf, readFragment } from 'gql.tada';
import type { Option, SelectFieldServerComponent } from 'payload';

export const ShopifyCollectionSelect: SelectFieldServerComponent = async ({
    clientField,
    path,
    schemaPath,
    permissions,
}) => {
    let allCollections: FragmentOf<typeof CollectionBasicFragment>[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    // Fetch all collections by paginating through the results
    while (hasNextPage) {
        const collectionsResult = await getCollectionsBasic({
            first: 100,
            after: endCursor,
        });

        allCollections = [...allCollections, ...collectionsResult.collections];
        hasNextPage = collectionsResult.hasNextPage;
        endCursor = collectionsResult.endCursor ?? null;
    }

    const options = allCollections.map<Option>((unsafeCollection) => {
        const collection = readFragment(
            CollectionBasicFragment,
            unsafeCollection,
        );

        return {
            value: collection.id,
            label: collection.title,
        };
    });

    return (
        <SelectField
            field={{
                ...clientField,
                type: 'select',
                options,
            }}
            path={path}
            schemaPath={schemaPath}
            permissions={permissions}
        />
    );
};

export default ShopifyCollectionSelect;
