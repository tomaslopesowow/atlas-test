import { cn } from '@repo/lib/utils/cn';
import type { ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { FittedHeading } from '@/components/content/fitted-heading';
import {
    HEADING_CLASS,
    LexicalRichText,
    renderChildren,
} from '@/components/content/lexical-node';
import { blocksRegistry } from '@/features/blocks/_internal/registry';

type HeadingTag = keyof typeof HEADING_CLASS;

// biome-ignore lint/suspicious/noExplicitAny: lexical nodes are untyped here
function extractHeadingLines(headingNodes: any[]) {
    return headingNodes.reduce<ReactNode[]>((lines, headingNode) => {
        let segmentChildren: any[] = [];

        const flushSegment = () => {
            if (segmentChildren.length === 0) return;
            lines.push(renderChildren(segmentChildren));
            segmentChildren = [];
        };

        for (const child of headingNode.children ?? []) {
            if (child.type === 'linebreak') {
                flushSegment();
            } else {
                segmentChildren.push(child);
            }
        }
        flushSegment();

        return lines;
    }, []);
}

const positionClassTV = tv({
    base: 'flex',
    variants: {
        position: {
            left: '',
            center: 'justify-center',
            right: 'justify-end',
        },
    },
});

const widthClassTV = tv({
    variants: {
        width: {
            large: '',
            medium: 'w-full md:w-10/12',
            small: 'w-full md:w-8/12',
        },
    },
});

type WidthType = 'large' | 'medium' | 'small';
const validWidths: WidthType[] = ['large', 'medium', 'small'];

type PositionType = 'left' | 'center' | 'right';
const validPositions: PositionType[] = ['left', 'center', 'right'];

blocksRegistry.addBlock({
    block: {
        slug: 'rich-text',
        imageURL: '/admin-assets/block-thumbnails/rich-text.png',
        labels: {
            singular: 'Rich Text',
            plural: 'Rich Text',
        },
        fields: [
            {
                name: 'content',
                type: 'richText',
                label: 'Content',
                localized: true,
            },
            {
                name: 'width',
                type: 'select',
                options: ['large', 'medium', 'small'],
                defaultValue: 'medium',
            },
            {
                name: 'position',
                type: 'select',
                options: ['left', 'right', 'center'],
                defaultValue: 'left',
            },
        ],
    },

    component: async ({ block: { content, width, position } }) => {
        // biome-ignore lint/suspicious/noExplicitAny: lexical content is untyped here
        const rootChildren: any[] = content?.root?.children ?? [];
        const headingNodes = rootChildren.filter(
            (node) => node.type === 'heading',
        );
        const isHeadingOnly =
            rootChildren.length > 0 &&
            headingNodes.length === rootChildren.length;

        if (isHeadingOnly) {
            const lines = extractHeadingLines(headingNodes);

            if (lines.length > 1) {
                const tag = headingNodes[0].tag as HeadingTag;

                return (
                    <div className="container">
                        <FittedHeading
                            tag={tag}
                            textClassName={cn(
                                HEADING_CLASS[tag],
                                'text-center',
                            )}
                            lines={lines}
                            className="max-w-full border-x-4 border-[red]"
                        />
                    </div>
                );
            }
        }

        return (
            <div className="container text-center w-[max-content] max-w-full">
                <LexicalRichText content={content} />
            </div>
        );
    },
});
