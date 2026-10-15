import { graphql } from '../graphql.storefront';

export const MoneyFragment = graphql(`
    fragment money on MoneyV2 {
        currencyCode
        amount
    }
`);
