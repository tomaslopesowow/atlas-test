export function extractIdFromGid(gid?: string) {
    return gid?.match(/gid:\/\/shopify\/\w+\/(\d+)/)?.[1];
}
