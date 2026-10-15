export const isClient = () => globalThis.constructor.name === 'Window';
export const isServer = () => !isClient();
export function clientGuard<T>(getter: () => T): T | undefined {
    return isClient() ? getter() : undefined;
}
