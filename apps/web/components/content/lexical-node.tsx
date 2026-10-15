import clsx from 'clsx';
import Image from 'next/image';
import type { Media } from '@/payload-types';
import type { TypedEditorState } from '@payloadcms/richtext-lexical';
import * as Sentry from '@sentry/nextjs';
import type { Maybe } from '@/utils/maybe';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type ListTag = 'ul' | 'ol';
type TextTag = 'span' | 'code' | 'mark' | 'sub' | 'sup';

const TEXT_FORMATS = ['center', 'right', 'justify'];

const HEADING_CLASS = {
    h1: 'text-4xl font-light font-serif',
    h2: 'text-3xl font-light font-serif',
    h3: 'text-2xl font-light font-serif',
    h4: 'text-xl font-light font-serif',
    h5: 'text-lg font-light font-serif',
    h6: 'font-light font-serif',
};

const INDENT_CLASS = {
    1: 'indent-4',
    2: 'indent-8',
    3: 'indent-12',
    4: 'indent-16',
    5: 'indent-20',
    6: 'indent-24',
    7: 'indent-28',
    8: 'indent-32',
};

// Lexical formatting types, based on https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalTextNode.ts
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;
const IS_STRIKETHROUGH = 1 << 2;
const IS_UNDERLINE = 1 << 3;
const IS_CODE = 1 << 4;
const IS_SUBSCRIPT = 1 << 5;
const IS_SUPERSCRIPT = 1 << 6;
const IS_HIGHLIGHT = 1 << 7;

export const TEXT_TYPE_TO_FORMAT = {
    bold: IS_BOLD,
    code: IS_CODE,
    highlight: IS_HIGHLIGHT,
    italic: IS_ITALIC,
    strikethrough: IS_STRIKETHROUGH,
    subscript: IS_SUBSCRIPT,
    superscript: IS_SUPERSCRIPT,
    underline: IS_UNDERLINE,
};

const hasFormat = (
    type: keyof typeof TEXT_TYPE_TO_FORMAT,
    format: number,
): boolean => (format & TEXT_TYPE_TO_FORMAT[type]) !== 0;

// biome-ignore lint/suspicious/noExplicitAny: TODO make this type safe
const renderChildren = (children: any[] = []) =>
    children.map((child, index) => (
        <LexicalNodeRenderer key={`${index}-${child.type}`} node={child} />
    ));

export function LexicalRenderer(props: { content?: Maybe<TypedEditorState> }) {
    if (!props.content) return null;
    return renderChildren(props.content.root.children);
}

export function LexicalRichText(props: {
    // biome-ignore lint/suspicious/noExplicitAny: TODO make this type safe
    content?: any;
    className?: string;
}) {
    if (!props.content) return null;
    return (
        <div
            className={clsx(
                'prose mx-auto prose-img:rounded-md prose-img:my-0',
                props.className,
            )}
        >
            <LexicalRenderer content={props.content} />
        </div>
    );
}

/**
 * This component is a rendering function for a rich text editor that turns serialized data into styled JSX elements based on their node types.
 */
// biome-ignore lint/suspicious/noExplicitAny: TODO make this type safe
export function LexicalNodeRenderer(props: { node: any }) {
    const children = props.node.children ?? [];

    switch (props.node.type) {
        case 'root':
            return renderChildren(children);

        case 'heading': {
            const Tag = props.node.tag as HeadingTag;
            return (
                <Tag
                    className={clsx(
                        HEADING_CLASS[
                            props.node.tag as keyof typeof HEADING_CLASS
                        ],
                        TEXT_FORMATS.includes(props.node.format) &&
                            `text-${props.node.format}`,
                    )}
                >
                    {renderChildren(children)}
                </Tag>
            );
        }

        case 'paragraph':
            return (
                <>
                    {!children?.length && <br />}

                    {children && children.length > 0 && (
                        <p
                            className={clsx(
                                props.node.indent &&
                                    INDENT_CLASS[
                                        props.node
                                            .indent as keyof typeof INDENT_CLASS
                                    ],
                                TEXT_FORMATS.includes(props.node.format) &&
                                    `text-${props.node.format}`,
                            )}
                        >
                            {renderChildren(children)}
                        </p>
                    )}
                </>
            );

        case 'horizontalrule':
            return <hr />;

        case 'linebreak':
            return <br />;

        case 'list': {
            const Tag = props.node.tag as ListTag;
            return (
                <Tag
                    className={clsx(
                        'list-inside',
                        props.node.tag === 'ol' ? 'list-decimal' : 'list-disc',
                    )}
                >
                    {renderChildren(children)}
                </Tag>
            );
        }

        case 'listitem':
            return (
                <li
                    className={clsx(
                        TEXT_FORMATS.includes(props.node.format) &&
                            `text-${props.node.format}`,
                    )}
                >
                    {renderChildren(children)}
                </li>
            );

        case 'quote':
            return (
                <blockquote
                    className={clsx(
                        'border-s-4 border-primary bg-secondary ps-2 text-primary',
                        TEXT_FORMATS.includes(props.node.format) &&
                            `text-${props.node.format}`,
                    )}
                >
                    {renderChildren(children)}
                </blockquote>
            );

        case 'link':
        case 'autolink': {
            const { url, newTab, doc, linkType } = props.node.fields as {
                url: string;
                newTab: boolean;
                // biome-ignore lint/suspicious/noExplicitAny: TODO make this type safe
                doc?: { relationTo: string; value: { [key: string]: any } };
                linkType: 'custom' | 'internal';
            };

            const href =
                linkType === 'internal' && !!doc ? doc.value.permalink : url;

            return (
                <a
                    className="underline focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:outline-2 focus-visible:rounded-md focus-visible:no-underline"
                    href={href}
                    rel={newTab ? 'noopener' : undefined}
                    target={newTab ? '_blank' : '_self'}
                >
                    {renderChildren(children)}
                </a>
            );
        }

        case 'text': {
            const format = props.node.format as unknown as number;

            if (format === 0) return <>{props.node.text as string}</>;

            let Tag: TextTag = 'span';
            if (hasFormat('code', format)) Tag = 'code';
            if (hasFormat('highlight', format)) Tag = 'mark';
            if (hasFormat('subscript', format)) Tag = 'sub';
            if (hasFormat('superscript', format)) Tag = 'sup';

            return (
                <Tag
                    className={clsx({
                        'font-bold': hasFormat('bold', format),
                        italic: hasFormat('italic', format),
                        underline: hasFormat('underline', format),
                        'line-through': hasFormat('strikethrough', format),
                        '![text-decoration:underline_line-through]':
                            hasFormat('underline', format) &&
                            hasFormat('strikethrough', format),
                    })}
                >
                    {props.node.text as string}
                </Tag>
            );
        }

        case 'upload': {
            const media = props.node?.value as Media;
            if (!media?.url) return null;
            return (
                <div className="relative aspect-[4/3] my-[2em]">
                    <Image
                        fill
                        src={props.node.value.url}
                        alt={media.description ?? 'media'}
                        className="object-cover"
                    />
                </div>
            );
        }

        default: {
            console.warn(`Unhandled node type: ${props.node.type}`, props);
            Sentry.captureMessage(`Unhandled node type: ${props.node.type}`, {
                level: 'warning',
                extra: props,
            });
        }
    }
}
