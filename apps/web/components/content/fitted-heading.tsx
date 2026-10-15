'use client';

import { cn } from '@repo/lib/utils/cn';
import {
    Fragment,
    type ReactNode,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

type FittedHeadingProps = {
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    textClassName: string;
    lines: ReactNode[];
    className?: string;
};

export function FittedHeading({
    tag: Tag,
    textClassName,
    lines,
    className,
}: FittedHeadingProps) {
    const containerName = `fit-${useId().replace(/:/g, '')}`;
    const probeRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const [containerQueries, setContainerQueries] = useState('');

    // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the lines change
    useLayoutEffect(() => {
        const measure = () => {
            const linesBeforeBreaks = probeRefs.current.slice(0, -1);
            const widestLine = linesBeforeBreaks.reduce(
                (widest, probe) =>
                    probe ? Math.max(widest, probe.offsetWidth) : widest,
                0,
            );

            if (widestLine === 0) {
                setContainerQueries('');
                return;
            }

            setContainerQueries(
                `@container ${containerName} (width < ${widestLine + 1}px){[data-break="${containerName}"]{display:none}}`,
            );
        };

        measure();
        document.fonts?.ready.then(measure);
    }, [containerName, lines]);

    return (
        <>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated container queries, never user markup */}
            <style dangerouslySetInnerHTML={{ __html: containerQueries }} />

            <div className={className} style={{ containerType: 'inline-size', containerName }}>
                <Tag className={textClassName}>
                    {lines.map((line, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: line order is stable
                        <Fragment key={index}>
                            {line}
                            {index < lines.length - 1 && (
                                <>
                                    {' '}
                                    <br data-break={containerName} />
                                </>
                            )}
                        </Fragment>
                    ))}
                </Tag>
            </div>

            <div
                aria-hidden
                className={cn(
                    textClassName,
                    'invisible absolute -left-[9999px] top-0 whitespace-nowrap',
                )}
            >
                {lines.map((line, index) => (
                    <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: line order is stable
                        key={index}
                        ref={(node) => {
                            probeRefs.current[index] = node;
                        }}
                        className="whitespace-nowrap"
                    >
                        {line}
                    </span>
                ))}
            </div>
        </>
    );
}
