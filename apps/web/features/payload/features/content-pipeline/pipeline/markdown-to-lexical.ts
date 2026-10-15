import {
    convertMarkdownToLexical,
    editorConfigFactory,
} from '@payloadcms/richtext-lexical';
import type {
    Block,
    BlocksField,
    Field,
    Payload,
    RichTextField,
} from 'payload';

/** The article collection + the rich-text block whose body we generate into. */
const ARTICLE_COLLECTION = 'pages';
const ARTICLE_BLOCK_SLUG = 'rich-text';
const ARTICLE_BLOCK_FIELD = 'content';

/**
 * Converts Markdown to a Lexical editor state valid for the `rich-text` block's
 * `content` field on `pages` — the single block a generated article body lives
 * in.
 *
 * That field has no editor of its own — it inherits the root lexical editor
 * configured in `payload.config.ts`. Reading the *sanitized* field straight off
 * the running Payload instance and handing it to `editorConfigFactory.fromField`
 * guarantees the converted output matches exactly the feature set the editor
 * accepts, so we can never produce nodes Payload would reject on save.
 *
 * Keep the input Markdown to text constructs only — headings (H2/H3), paragraphs,
 * bold/italic, lists, links and blockquotes. Do NOT include images (`![]()`):
 * the upload node needs a real media document id we do not provide here.
 */
export function markdownToLexicalBody(payload: Payload, markdown: string) {
    const field = findArticleBlockContentField(payload);
    const editorConfig = editorConfigFactory.fromField({ field });

    return convertMarkdownToLexical({ editorConfig, markdown });
}

/**
 * Locates the sanitized `content` richText field on the `rich-text` block of
 * the article collection. After init the field carries the resolved root
 * editor, which `fromField` needs.
 */
function findArticleBlockContentField(payload: Payload): RichTextField {
    const collection = payload.config.collections.find(
        (c) => c.slug === ARTICLE_COLLECTION,
    );
    if (!collection) {
        throw new Error(
            `markdownToLexicalBody: \`${ARTICLE_COLLECTION}\` collection not found.`,
        );
    }

    const blocksField = findBlocksField(collection.fields as Field[]);
    if (!blocksField) {
        throw new Error(
            `markdownToLexicalBody: no blocks field found on \`${ARTICLE_COLLECTION}\`.`,
        );
    }

    const block = (blocksField.blocks as Block[]).find(
        (b) => b.slug === ARTICLE_BLOCK_SLUG,
    );
    if (!block) {
        throw new Error(
            `markdownToLexicalBody: \`${ARTICLE_BLOCK_SLUG}\` block not registered on \`${ARTICLE_COLLECTION}\`.`,
        );
    }

    const content = block.fields.find(
        (field): field is RichTextField =>
            field.type === 'richText' &&
            'name' in field &&
            field.name === ARTICLE_BLOCK_FIELD,
    );
    if (!content) {
        throw new Error(
            `markdownToLexicalBody: \`${ARTICLE_BLOCK_FIELD}\` richText field not found on the \`${ARTICLE_BLOCK_SLUG}\` block.`,
        );
    }

    return content;
}

/**
 * Depth-first search for the first `blocks` field, descending into the
 * container field types Payload nests fields under (tabs, then any field
 * carrying a `fields` array: groups, rows, collapsibles).
 */
function findBlocksField(fields: Field[]): BlocksField | undefined {
    for (const field of fields) {
        if (field.type === 'blocks') return field;

        if (field.type === 'tabs') {
            for (const tab of field.tabs) {
                const found = findBlocksField(tab.fields);
                if (found) return found;
            }
        } else if ('fields' in field && Array.isArray(field.fields)) {
            const found = findBlocksField(field.fields);
            if (found) return found;
        }
    }

    return undefined;
}
