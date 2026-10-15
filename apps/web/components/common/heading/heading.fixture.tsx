'use client';

import { useFixtureSelect } from 'react-cosmos/client';
import type { HeadingVariantProps } from '.';
import Heading from '.';

const variants: NonNullable<HeadingVariantProps['variant']>[] = [
    'display-1',
    'display-2',
    'heading-1',
    'heading-2',
    'heading-3',
    'heading-4',
    'heading-5',
    'heading-6',
];

const Fixture = () => {
    const [variant] = useFixtureSelect<string>('variant', {
        options: variants as string[],
        defaultValue: 'heading-1',
    });

    return (
        <div className="p-4 flex flex-col gap-4">
            <p className="text-slate-400">{variant}</p>
            <Heading
                as="h1"
                variant={variant as HeadingVariantProps['variant']}
            >
                Welcome to the Omnipresent World of Wizkids
            </Heading>
        </div>
    );
};

export default Fixture;
