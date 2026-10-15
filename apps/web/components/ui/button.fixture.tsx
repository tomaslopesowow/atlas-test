'use client';

import { useFixtureInput, useFixtureSelect } from 'react-cosmos/client';
import { buttonVariants } from './button';
import { Button } from './button';

const variants = buttonVariants.variants.variant;
const sizes = buttonVariants.variants.size;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

const VARIANT_OPTIONS = ['none', ...Object.keys(variants)] as Variant[];

const SIZE_OPTIONS = ['none', ...Object.keys(sizes)] as Size[];

const WIDTH_OPTIONS = ['fixed', 'fluid'] as const;

const Fixture = () => {
    const [text] = useFixtureInput('text', 'Button');

    const [variant] = useFixtureSelect('Variant', {
        options: VARIANT_OPTIONS,
        defaultValue: 'primary',
    });

    const [size] = useFixtureSelect('Size', {
        options: SIZE_OPTIONS,
        defaultValue: 'sm',
    });

    const [desktopVariant] = useFixtureSelect('Desktop variant', {
        options: VARIANT_OPTIONS,
        defaultValue: 'none',
    });

    const [desktopSize] = useFixtureSelect('Desktop size', {
        options: SIZE_OPTIONS,
        defaultValue: 'none',
    });

    const [width] = useFixtureSelect('Width', {
        options: [...WIDTH_OPTIONS],
        defaultValue: 'fluid',
    });

    const [disabled] = useFixtureSelect('disabled', {
        options: ['Yes', 'No'],
        defaultValue: 'No',
    });

    return (
        <div className="w-full h-screen flex items-center justify-center">
            <Button
                size={{
                    initial: size,
                    sm: desktopSize as Size,
                }}
                variant={{
                    initial: variant,
                    sm: desktopVariant as Variant,
                }}
                width={width}
                disabled={disabled === 'Yes'}
            >
                {text}
            </Button>
        </div>
    );
};

export default Fixture;
