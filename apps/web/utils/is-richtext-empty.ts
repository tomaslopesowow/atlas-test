import type { TypedEditorState } from '@payloadcms/richtext-lexical';

// Function to check if a rich text is empty
export const isRichTextEmpty = (richText: TypedEditorState) => {
    for (const child of richText.root.children) {
        if (!child.children) continue;
        if (child.children.length > 0) {
            return false;
        }
    }
    return true;
};
