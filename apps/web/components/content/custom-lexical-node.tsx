import {
    type ComponentProps,
    type ComponentType,
    type JSX,
    type ReactNode,
    createElement,
} from 'react';
import { TEXT_TYPE_TO_FORMAT } from './lexical-node';

export type AnyTag = keyof JSX.IntrinsicElements;

interface SerializedEditorNode {
    type: string;
    tag?: AnyTag;
    text?: string;
    format?: number;
    children?: SerializedEditorNode[];
}

type MappedComponent<
    T extends ComponentType | AnyTag = ComponentType | AnyTag,
> = {
    component: T;
    props?: ComponentProps<T>;
};
export type NodeMap = {
    [K in AnyTag]?: MappedComponent;
};

export type CustomNodeProps = {
    nodes?: SerializedEditorNode[];
    nodeMap?: NodeMap;
};

/**
 * Derives HTML tag from node info.
 * Returns existing 'tag' property or assigns based on type, format.
 * Supports some text formats and defaults to 'span' for other text formats,
 * and 'p' for other types.
 */
const getTagName = ({
    tag,
    type,
    format,
}: SerializedEditorNode): keyof JSX.IntrinsicElements => {
    if (tag) return tag;

    switch (type) {
        case 'text':
            switch (format) {
                case TEXT_TYPE_TO_FORMAT.bold:
                    return 'strong';
                case TEXT_TYPE_TO_FORMAT.subscript:
                    return 'sub';
                case TEXT_TYPE_TO_FORMAT.superscript:
                    return 'sup';
                case TEXT_TYPE_TO_FORMAT.highlight:
                    return 'mark';
                default:
                    return 'span';
            }
    }

    return 'p';
};

/**
 * Converts the lexical nodes into custom tags.
 * If the custom tag isn't defined in the nodeMap, it is assigned a default tag.
 */
export const createCustomNode = ({
    nodes,
    nodeMap,
}: CustomNodeProps): ReactNode => {
    return nodes?.map((item, index) => {
        const children = createCustomNode({ nodes: item.children, nodeMap });
        const tagName = getTagName(item);
        const { component = tagName, props = {} } = nodeMap?.[tagName] ?? {};

        return createElement(
            component,
            { key: index, ...props },
            children ?? item.text,
        );
    });
};
