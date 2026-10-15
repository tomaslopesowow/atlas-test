import { SelectField } from '@payloadcms/ui';
import type { Option, SelectFieldServerComponent } from 'payload';
import type { ProductBasicType } from '@/api/fragments/product-basic.admin';
import { getProductsBasic } from '@/api/get-products-basic.admin';

export const ShopifyProductSelect: SelectFieldServerComponent = async ({
    clientField,
    path,
    schemaPath,
    permissions,
}) => {
    let allProducts: ProductBasicType[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    // Fetch all products by paginating through the results
    while (hasNextPage) {
        const productsResult = await getProductsBasic({
            first: 100,
            after: endCursor,
        });

        allProducts = [...allProducts, ...productsResult.products];
        hasNextPage = productsResult.hasNextPage;
        endCursor = productsResult.endCursor ?? null;
    }

    const options = allProducts.map<Option>((product) => {
        return {
            value: product.id,
            label: product.title,
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

export default ShopifyProductSelect;
