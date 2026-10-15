export interface ProductTaxonomyPage {
    taxonomyData?: {
        product?: {
            shopifyProductId?: string | null;
        } | null;
        [key: string]: unknown;
    } | null;
}

export interface EcommerceLinkPage {
    permalink?: string | null;
}

export interface EcommerceSettings {
    shopPage?: EcommerceLinkPage | string | null;
    cartPage?: EcommerceLinkPage | string | null;
}
