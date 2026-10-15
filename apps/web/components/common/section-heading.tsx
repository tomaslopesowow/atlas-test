import type { Maybe } from '@repo/lib/types/maybe';
import { cn } from '@repo/lib/utils/cn';
import Heading, { type HeadingProps } from '@repo/ui/components/heading';

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
            className={cn(
                'flex flex-col gap-y-6 text-pretty max-w-prose',
                align === 'center' && 'items-center text-center',
                className,
            )}
        >
            <div className="flex flex-col gap-y-4">
                {sectionTitle && (
                    <Heading variant="base">{sectionTitle}</Heading>
                )}

                {title && (
                    <Heading as={as} variant={variant}>
                        {title}
                    </Heading>
                )}
            </div>

            {text && <p>{text}</p>}
        </div>
    );
};
