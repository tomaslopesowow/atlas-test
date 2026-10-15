import type { SerializedEditorNode } from '@/components/content/custom-lexical-node';
import type { Maybe } from './maybe';

// Function to check if a rich text is empty
export const isRichTextEmpty = (
    richText: Maybe<{
        root: { children: SerializedEditorNode[] };
    }>,
) => {
    if (!richText) return true;
    for (const child of richText.root.children) {
        if (!child.children) continue;
        if (child.children.length > 0) {
            return false;
        }
    }
    return true;
};
