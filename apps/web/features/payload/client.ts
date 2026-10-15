import { getPayload } from 'payload';

export const getPayloadClient = async () => {
    // Dynamic import to break circular dependency:
    // payload.config.ts → blocks/all → importMap → block files → client.ts → payload.config.ts
    const { default: config } = await import('@payload-config');
    return getPayload({ config });
};
