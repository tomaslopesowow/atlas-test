import { findOptions } from '@/lib/api';
import { titleInput } from '@/lib/form-values';
import { Combobox } from './Combobox';

/** Picks a record of `resource`, searched by title as one types; submits its key, and its title for a refused submit. */
export function RelationPicker({
    resource,
    defaultKey,
    defaultTitle,
    ...props
}: {
    id: string;
    name: string;
    resource: string;
    defaultKey?: string;
    defaultTitle?: string;
    clearable: boolean;
    invalid?: boolean;
    describedBy?: string;
    placeholder?: string;
}) {
    return (
        <Combobox
            {...props}
            defaultValue={defaultKey}
            defaultLabel={defaultTitle}
            labelName={titleInput(props.name)}
            search={async (term) =>
                (await findOptions(resource, term)).map(({ key, title }) => ({
                    value: String(key),
                    label: title,
                }))
            }
        />
    );
}
