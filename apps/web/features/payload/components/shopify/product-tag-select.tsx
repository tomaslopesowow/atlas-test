import { getProductTags } from '@/features/shopify/api/get-product-tags.admin';
import { SelectField } from '@payloadcms/ui';
import type { SelectFieldServerComponent } from 'payload';

export const ShopifyProductTagSelect: SelectFieldServerComponent = async ({
    clientField,
    path,
    schemaPath,
    permissions,
}) => {
    let allTags: string[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    // Fetch all products by paginating through the results
    while (hasNextPage) {
        const tagsResult = await getProductTags({
            first: 100,
            after: endCursor,
        });

        allTags = [...allTags, ...(tagsResult.productTags?.nodes ?? [])];
        hasNextPage = tagsResult.productTags?.pageInfo?.hasNextPage ?? false;
        endCursor = tagsResult.productTags?.pageInfo?.endCursor ?? null;
    }

    return (
        <SelectField
            field={{
                ...clientField,
                type: 'select',
                options: allTags,
            }}
            path={path}
            schemaPath={schemaPath}
            permissions={permissions}
        />
    );
};

export default ShopifyProductTagSelect;
