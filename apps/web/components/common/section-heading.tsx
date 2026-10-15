import type { Maybe } from '@/utils/maybe';
import clsx from 'clsx';
import Heading, { type HeadingProps } from './heading';

type SectionHeadingProps = {
    sectionTitle?: Maybe<string>;
    title?: Maybe<string>;
    text?: Maybe<string>;
    align?: 'left' | 'center';
    className?: string;
} & Pick<HeadingProps, 'as' | 'variant'>;

export const SectionHeading = ({
    sectionTitle,
    title,
    text,
    align = 'left',
    className,
    as = sectionTitle ? 'h3' : 'h2',
    variant = 'heading-2',
    ...props
}: SectionHeadingProps) => {
    if (!sectionTitle && !title && !text) return null;
    return (
        <div
            {...props}
            className={clsx(
                'flex flex-col gap-y-4 md:gap-y-6 text-pretty max-w-prose',
                align === 'center' && 'items-center text-center',
                className,
            )}
        >
            {sectionTitle && (
                <Heading className="font-mono uppercase" variant="base">
                    {sectionTitle}
                </Heading>
            )}

            {title && (
                <Heading as={as} variant={variant}>
                    {title}
                </Heading>
            )}
            {text && <p>{text}</p>}
        </div>
    );
};
