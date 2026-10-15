'use client';

import type { PropsWithChildren } from 'react';
import { type Client, Provider } from 'urql';

export const UrqlProvider = ({
    children,
    client,
}: PropsWithChildren<{ client: Client }>) => (
    <Provider value={client}>{children}</Provider>
);

export default UrqlProvider;
