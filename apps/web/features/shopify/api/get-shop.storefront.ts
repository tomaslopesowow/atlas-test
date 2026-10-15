import type { VariablesOf } from 'gql.tada';
import { storefrontQuery } from './client';
import { graphql } from './graphql.storefront';

export const GetShopQuery = graphql(
    `
    query GetShop( $country: CountryCode, $language: LanguageCode) 
    @inContext(country: $country, language: $language) {
        localization {
            market {
                id
                handle
            }
            availableCountries {
                name
                isoCode
                currency {
                    name
                }
            }
            country {
                name
                isoCode
            }
            language {
                name
                isoCode
            }
        }

        shop {
            id
            name
        }
    }
`,
);

export const getShop = (variables: VariablesOf<typeof GetShopQuery>) =>
    storefrontQuery({ query: GetShopQuery, variables }, (data) => ({
        shop: data?.shop,
        localization: data?.localization,
    }));
