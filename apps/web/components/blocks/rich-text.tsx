import { blocksRegistry } from '@/features/blocks/registry';
import { RichText } from '@/features/payload/blocks/rich-text';
import { LexicalRichText } from '../content/lexical-node';

blocksRegistry.addBlock(RichText.slug, {
    component: ({ block }) => <LexicalRichText content={block.content} />,
});
