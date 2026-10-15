import { clsx } from 'clsx';
import { createElement, Fragment, type ReactNode } from 'react';
import type { SerializedEditorNode } from '@/components/content/custom-lexical-node';

const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;

type LexicalNode = { root: { children: SerializedEditorNode[] } };

const isLexicalNode = (node: unknown): node is LexicalNode =>
    typeof node === 'object' &&
    node !== null &&
    'root' in node &&
    typeof node.root === 'object' &&
    node.root !== null &&
    'children' in node.root;

export function renderLexicalSimple(
    content: ReactNode | LexicalNode,
    options?: {
        highlightBoldText?: boolean;
    },
): ReactNode {
    if (!isLexicalNode(content)) {
        return content as ReactNode;
    }

    const result: ReactNode[] = [];
    let breakCounter = 0;

    content.root.children.forEach((paragraph, paragraphIndex) => {
        const children = paragraph.children || [];

        if (paragraphIndex > 0) {
            result.push(
                createElement('br', { key: `break-${breakCounter++}` }),
            );
        }

        children.forEach((node, nodeIndex) => {
            const key = `${paragraphIndex}-${nodeIndex}-${node.type}-${node.text || ''}`;

            if (node.type === 'linebreak') {
                result.push(createElement('br', { key }));
                return;
            }

            if (node.type === 'text' && node.text !== undefined) {
                const isItalic = node.format === IS_ITALIC;
                const isBold = node.format === IS_BOLD;
                const isUppercase =
                    (node as { $?: { textTransform?: string } }).$
                        ?.textTransform === 'uppercase';

                const styled = isItalic || isUppercase || isBold;
                const Tag = styled ? 'span' : Fragment;
                const props = styled
                    ? {
                          key,
                          className: clsx({
                              italic: isItalic,
                              uppercase: isUppercase,
                              'font-bold':
                                  isBold && !options?.highlightBoldText,
                              'text-highlight':
                                  isBold && options?.highlightBoldText,
                          }),
                      }
                    : { key };

                result.push(createElement(Tag, props, node.text));
            }
        });
    });

    return createElement(Fragment, null, ...result);
}
