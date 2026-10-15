import type { Field } from '../fields/field.js';
import type { ActionHandleInput, ActionResult } from '../types/types.js';

/**
 * Something to do to the records picked on the index or detail page, e.g. publishing posts.
 * Listed by a resource's `actions()`; asks for its fields' values first when it has any.
 */
export abstract class Action<TEntity extends object = object> {
    /** Its segment in the url; the class name in kebab case, without Action, when unset. */
    name?: string;
    label?: string;
    /** Its run button red, as it destroys or cannot be undone. */
    destructive = false;
    /** Said on its page above the run button, e.g. what it will do. */
    confirmText?: string;
    showOnIndex = true;
    showOnDetail = true;
    /** Runs on no records, picked among the index's actions with none selected, e.g. an import or a report; `records` is then empty. */
    standalone = false;

    /** What to ask for before running, as the values `handle` gets. */
    fields(): Field[] {
        return [];
    }

    /** Runs on the records; the message it resolves with is shown, or a count of the records when none. */
    abstract handle(
        input: ActionHandleInput<TEntity>,
    ): Promise<ActionResult | undefined>;
}
