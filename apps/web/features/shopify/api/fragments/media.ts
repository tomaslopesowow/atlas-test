import { graphql } from '../graphql.storefront';

export const ImageFragment = graphql(`
    fragment image on Image {
        id
        url
        altText
        width
        height
    }
`);

export const MediaImageFragment = graphql(
    `
    fragment mediaImage on MediaImage {
        id
        image {
            ...image
        }
    }
`,
    [ImageFragment],
);
