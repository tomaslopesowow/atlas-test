import cloneDeep from 'lodash.clonedeep';
import type { Field } from 'payload';

export function fieldCreator<In extends Field>(field: In) {
    function processField(overwrite?: Partial<In>): Readonly<In>;
    function processField<Out>(overwrite?: (base: In) => Out): Readonly<Out>;

    // biome-ignore lint/suspicious/noExplicitAny: inferred from usage
    function processField(overwrite?: any) {
        const copy = cloneDeep(field);
        if (overwrite instanceof Function) return overwrite(copy);
        if (overwrite) return { ...copy, ...overwrite };
        return copy;
    }

    return processField;
}
