import { clsx } from 'clsx';
import { Fragment, type ReactNode } from 'react';
import type { SerializedEditorNode } from './custom-lexical-node';

// Lexical format constant for italic
const IS_ITALIC = 1 << 1; // format: 2

/**
 * Simple renderer for Lexical content that only handles italic, uppercase, and line breaks.
 * Uses <span> (inline) instead of <p> (block) because paragraphs are not allowed inside headings.
 *
 * @param content - Lexical content object with root.children structure, or ReactNode to pass through
 * @returns ReactNode with rendered text nodes and line breaks, or the original content if not a Lexical object
 */
export function renderLexicalSimple(
    content: ReactNode | { root: { children: SerializedEditorNode[] } },
): ReactNode {
    // Check if content is a Lexical object
    if (
        typeof content !== 'object' ||
        content === null ||
        !('root' in content) ||
        typeof content.root !== 'object' ||
        content.root === null ||
        !('children' in content.root)
    ) {
        return content as ReactNode;
    }

    const result: ReactNode[] = [];
    let breakCounter = 0;

    content.root.children.forEach((paragraph, paragraphIndex) => {
        const children = paragraph.children || [];

        // Add line break between paragraphs to simulate <p> block behavior
        if (paragraphIndex > 0) {
            result.push(<br key={`break-${breakCounter++}`} />);
        }

        // Process text nodes in the paragraph
        children.forEach((node, nodeIndex) => {
            const key = `${paragraphIndex}-${nodeIndex}-${node.type}-${node.text || ''}`;

            // Handle line break nodes (SHIFT+ENTER)
            if (node.type === 'linebreak') {
                result.push(<br key={key} />);
                return;
            }

            // Handle text nodes
            if (node.type === 'text' && node.text !== undefined) {
                // Check for italic (format: 2)
                const isItalic = node.format === IS_ITALIC;

                // Check for uppercase (stored in $ property)
                const isUppercase =
                    (node as { $?: { textTransform?: string } }).$
                        ?.textTransform === 'uppercase';

                const Tag = isItalic || isUppercase ? 'span' : Fragment;

                const props =
                    isItalic || isUppercase
                        ? {
                              className: clsx({
                                  italic: isItalic,
                                  uppercase: isUppercase,
                              }),
                          }
                        : undefined;

                result.push(
                    <Tag key={key} {...props}>
                        {node.text}
                    </Tag>,
                );
            }
        });
    });

    return <>{result}</>;
}
