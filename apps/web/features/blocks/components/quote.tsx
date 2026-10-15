import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { LexicalRenderer } from '@/components/content/lexical-node';

defineBlockComponent({
    slug: 'quote',
    component: ({ block }) => {
        if (!block.quote) return null;

        // prepend quote mark to the first text node
        const firstParagraph = block.quote.root.children.find(
            (child) => child.type === 'paragraph',
        );

        const firstTextNode = Array.isArray(firstParagraph?.children)
            ? firstParagraph.children.find((child) => child.type === 'text')
            : null;

        if (firstTextNode?.text) {
            firstTextNode.text = `“${firstTextNode.text}`;
        }

        // append quote mark to the last text node
        const lastParagraph = block.quote.root.children.findLast(
            (child) => child.type === 'paragraph',
        );

        const lastTextNode = Array.isArray(lastParagraph?.children)
            ? lastParagraph.children.find((child) => child.type === 'text')
            : null;

        if (lastTextNode?.text) {
            lastTextNode.text = `${lastTextNode.text}”`;
        }

        return (
            <div className="grid grid-cols-12 container pt-40 pb-20">
                <blockquote className="flex flex-col gap-y-12 col-span-12 lg:col-span-10 lg:col-start-2">
                    <span className="text-5xl font-serif leading-[1.4] text-headline">
                        <LexicalRenderer content={block.quote} />
                    </span>

                    {block.citee?.name && (
                        <div className="flex flex-col font-sweet-sans-pro uppercase">
                            <span className="text-sm text-headline">
                                {block.citee?.name}
                            </span>

                            {block.citee?.title && (
                                <span className="text-sm text-placeholder">
                                    {block.citee?.title}
                                </span>
                            )}
                        </div>
                    )}
                </blockquote>
            </div>
        );
    },
});
