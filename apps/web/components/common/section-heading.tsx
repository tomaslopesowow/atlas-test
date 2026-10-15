import { AnimatedHeading } from '@/features/animation/components/animated-heading';
import { cn } from '@/features/shadcn/utils/ui';
import type { Maybe } from '@/utils/maybe';
import { Heading, type HeadingProps } from './heading';
import { renderLexicalSimple } from '../content/render-lexical-simple';
import type { TypedEditorState } from '@payloadcms/richtext-lexical';
import type { AnimatedHeadingConfig } from '@/types/shared';

type SectionHeadingProps = {
    eyebrow?: Maybe<string>;
    title?: Maybe<TypedEditorState> | Maybe<string>;
    subTitle?: Maybe<string>;
    align?: 'left' | 'center';
    className?: string;
    config?: AnimatedHeadingConfig;
} & Pick<HeadingProps, 'as' | 'variant'>;

const DEFAULT_CONFIG: AnimatedHeadingConfig = {
    fillOnScroll: { enabled: true },
    fadeIn: { scrub: 3 },
};

export const SectionHeading = ({
    eyebrow,
    title,
    subTitle,
    align = 'center',
    className,
    as = eyebrow ? 'h3' : 'h2',
    variant = 'heading-2',
    config,
    ...props
}: SectionHeadingProps) => {
    if (!eyebrow && !title && !subTitle) return null;
    return (
        <div
            {...props}
            className={cn(
                'flex flex-col items-center gap-y-8 sm:gap-y-16 px-4',
                className,
            )}
        >
            <Heading
                variant="base"
                className="text-center max-w-2xl leading-none"
            >
                {eyebrow}
            </Heading>
            <AnimatedHeading
                config={config ?? DEFAULT_CONFIG}
                variant={variant}
                className="text-center max-w-5xl leading-none"
            >
                {typeof title === 'string' ? title : renderLexicalSimple(title)}
            </AnimatedHeading>
            <Heading
                variant="base"
                className="text-center max-w-2xl leading-none"
            >
                {subTitle}
            </Heading>
        </div>
    );
};
