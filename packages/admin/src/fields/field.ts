import type {
    FieldConstraints,
    FieldSchema,
    FieldType,
    FieldVisibility,
    SelectOption,
} from '@repo/admin-contract';
import type {
    ColumnDefaults,
    FieldResolver,
    FieldRule,
    FileStore,
    FileUrl,
    ResourceClass,
} from '../types/types.js';
import { defined, humanize } from '../utils.js';

/** A page a field shows on, or not. */
type Page = keyof FieldVisibility;

/**
 * A field of a resource, configured fluently: `Text.make('title', 'Headline').sortable()`. What it
 * leaves unset, its column decides: required, nullable, a text's length, an enum's options.
 */
export abstract class Field {
    abstract readonly type: FieldType;
    /** The pages a field of this type is left off until shown, e.g. a textarea's index. */
    protected static readonly hiddenOn: Page[] = [];

    /** The property it reads and writes. */
    readonly name: string;
    /** The component a custom field is shown and edited by, as the panel registers it. */
    component?: string;
    private labelText: string;
    private helpText?: string;
    private isSortable = false;
    private isFilterable = false;
    private isReadonly = false;
    // unset until the resource or its column says
    private isNullable?: boolean;
    private isRequired?: boolean;
    private readonly setPages = new Set<Page>();
    private readonly shownOn: FieldVisibility = {
        index: true,
        detail: true,
        create: true,
        update: true,
    };
    private limits: FieldConstraints = {};
    private readonly checks: FieldRule[] = [];
    private readonly resolveWith?: FieldResolver;

    constructor(attribute: string, label?: string | FieldResolver) {
        this.name = attribute;
        this.labelText =
            typeof label === 'string' ? label : humanize(attribute);

        for (const page of (this.constructor as typeof Field).hiddenOn)
            this.shownOn[page] = false;

        if (typeof label === 'function') {
            this.resolveWith = label;
            this.readonly().show({ create: false, update: false });
        }
    }

    /** A field of this type, e.g. `Text.make('title')`; a resource uses `this.make(Text, 'title')`, which knows its entity's properties. */
    static make<T extends Field, A extends unknown[]>(
        this: new (
            ...args: A
        ) => T,
        ...args: A
    ): T {
        return new this(...args);
    }

    /** What it is called on every page; for a computed field, whose label make() cannot take. */
    label(text: string) {
        this.labelText = text;
        return this;
    }

    help(text: string) {
        this.helpText = text;
        return this;
    }

    sortable(on = true) {
        this.isSortable = on;
        return this;
    }

    /** A filter of its list by this field: an option, yes or no, or days, for a select, boolean or date. */
    filterable(on = true) {
        this.isFilterable = on;
        return this;
    }

    readonly(on = true) {
        this.isReadonly = on;
        return this;
    }

    nullable(on = true) {
        this.isNullable = on;
        return this;
    }

    /** Must be given when creating; so is a column that is not nullable and has no default, unless set. */
    required(on = true) {
        this.isRequired = on;
        return this;
    }

    hideFromIndex() {
        return this.show({ index: false });
    }

    hideFromDetail() {
        return this.show({ detail: false });
    }

    hideWhenCreating() {
        return this.show({ create: false });
    }

    hideWhenUpdating() {
        return this.show({ update: false });
    }

    showOnIndex() {
        return this.show({ index: true });
    }

    showOnDetail() {
        return this.show({ detail: true });
    }

    showOnCreating() {
        return this.show({ create: true });
    }

    showOnUpdating() {
        return this.show({ update: true });
    }

    onlyOnIndex() {
        return this.show({ ...HIDDEN, index: true });
    }

    onlyOnDetail() {
        return this.show({ ...HIDDEN, detail: true });
    }

    onlyOnForms() {
        return this.show({ ...HIDDEN, create: true, update: true });
    }

    /** Shown on the index and detail pages only. */
    exceptOnForms() {
        return this.show({
            index: true,
            detail: true,
            create: false,
            update: false,
        });
    }

    /** Limits the form enforces and the API checks: `min`/`max` for numbers, `minLength`/`maxLength` for text. */
    constraints(limits: FieldConstraints) {
        this.limits = { ...this.limits, ...limits };
        return this;
    }

    /** Checks the API runs on a given value, each returning what is wrong with it, or nothing. */
    rules(...rules: FieldRule[]) {
        this.checks.push(...rules);
        return this;
    }

    /** The resolver of a computed field. */
    get computed(): FieldResolver | undefined {
        return this.resolveWith;
    }

    /** Stores a file field's uploads; none for any other field. */
    get storage(): FileStore | undefined {
        return undefined;
    }

    /** Where a file field's value is seen; none for any other field. */
    get urlResolver(): FileUrl | undefined {
        return undefined;
    }

    /** The resource a relation field's records belong to, when it names one. */
    get resource(): ResourceClass | undefined {
        return undefined;
    }

    get validators(): readonly FieldRule[] {
        return this.checks;
    }

    get filtered(): boolean {
        return this.isFilterable;
    }

    /** Whether a create or update writes it; a computed field only after `readonly(false)`, for the resource's create() and update() to save. */
    get isWritable(): boolean {
        return !this.isReadonly && !this.isToMany;
    }

    /** A hasMany or belongsToMany, whose records are listed rather than held. */
    get isToMany(): boolean {
        return this.type === 'hasMany' || this.type === 'belongsToMany';
    }

    get isRelation(): boolean {
        return this.type === 'belongsTo' || this.isToMany;
    }

    /** What its column says of what the resource left unset; the registry's, at boot. */
    defaults({ nullable, required, maxLength, offForms }: ColumnDefaults) {
        this.isNullable ??= nullable;
        this.isRequired ??= required;
        if (maxLength !== undefined) this.limits.maxLength ??= maxLength;
        if (offForms)
            for (const page of ['create', 'update'] as const)
                if (!this.setPages.has(page)) this.shownOn[page] = false;
    }

    toSchema(): FieldSchema {
        return {
            name: this.name,
            type: this.type,
            label: this.labelText,
            ...defined({ help: this.helpText, component: this.component }),
            sortable: this.isSortable,
            readonly: this.isReadonly,
            nullable: this.isNullable ?? false,
            required: this.isRequired ?? false,
            visibility: { ...this.shownOn },
            ...(Object.keys(this.limits).length && {
                constraints: { ...this.limits },
            }),
        };
    }

    private show(pages: Partial<FieldVisibility>) {
        Object.assign(this.shownOn, pages);
        for (const page of Object.keys(pages) as Page[])
            this.setPages.add(page);
        return this;
    }
}

const HIDDEN: FieldVisibility = {
    index: false,
    detail: false,
    create: false,
    update: false,
};

/** What a field's constructor takes after the property: its label or computation, and the like. */
export type AfterAttribute<T> = T extends [unknown?, ...infer R] ? R : never;

/** A field class, as `Text` or `BelongsTo`. */
export type FieldClass = abstract new (...args: never[]) => Field;

/** The primary key, `ID.make()` for `id`: sortable, and off the forms, as the database makes it. */
export class ID extends Field {
    readonly type = 'id';
    protected static override readonly hiddenOn: Page[] = ['create', 'update'];

    constructor(attribute = 'id', label: string | FieldResolver = 'ID') {
        super(attribute, label);
        this.sortable();
    }
}

export class Text extends Field {
    readonly type = 'text';
}

export class Textarea extends Field {
    readonly type = 'textarea';
    protected static override readonly hiddenOn: Page[] = ['index'];
}

export class Email extends Field {
    readonly type = 'email';
}

/** Written, never read back: the API leaves it out of every record it returns. */
export class Password extends Field {
    readonly type = 'password';
    protected static override readonly hiddenOn: Page[] = ['index', 'detail'];
}

// Number, Boolean, Date and File would shadow the JavaScript globals of those names
export class NumberField extends Field {
    readonly type = 'number';
}

export class BooleanField extends Field {
    readonly type = 'boolean';
}

/** A calendar date, as `2026-10-08`. */
export class DateField extends Field {
    readonly type = 'date';
}

/** A moment in time, as an ISO string. */
export class DateTime extends Field {
    readonly type = 'datetime';
}

/** One of `options()`: `{ value, label }`s, plain values or an enum; an enum column's values when unset. */
export class Select extends Field {
    readonly type = 'select';
    private choices?: SelectOption[];

    options(
        options:
            | SelectOption[]
            | readonly (string | number)[]
            | Record<string, string | number>,
    ) {
        this.choices = Array.isArray(options)
            ? options.map((option) =>
                  typeof option === 'object'
                      ? option
                      : { value: option, label: humanize(String(option)) },
              )
            : // a numeric enum maps its values back to its keys too, which are no options
              Object.entries(options)
                  .filter(([key]) => !/^\d+$/.test(key))
                  .map(([key, value]) => ({ value, label: humanize(key) }));
        return this;
    }

    override defaults(column: ColumnDefaults) {
        super.defaults(column);
        if (!this.choices && column.options) this.options(column.options);
    }

    override toSchema(): FieldSchema {
        return { ...super.toSchema(), options: this.choices ?? [] };
    }
}

/** A JSON value, edited as its text; a Textarea keeps text as it is typed. */
export class Json extends Field {
    readonly type = 'json';
    protected static override readonly hiddenOn: Page[] = ['index'];
}

/** An uploaded file: `store()` returns what the column keeps, e.g. a path or a media id, and `preview()` its url. */
export class FileField extends Field {
    readonly type = 'file';
    protected static override readonly hiddenOn: Page[] = ['index'];
    private accepted: string[] = [];
    private largest = 10 * 1024 * 1024;
    private storeWith?: FileStore;
    private urlOf?: FileUrl;

    /** The mime types it takes, e.g. `image/*` or `application/pdf`; any when unset. */
    acceptedTypes(...types: string[]) {
        this.accepted = types;
        return this;
    }

    /** The largest file it takes, in bytes; 10 MB when unset. */
    maxSize(bytes: number) {
        this.largest = bytes;
        return this;
    }

    /** Stores an uploaded file, resolving with the value its column keeps. */
    store(store: FileStore) {
        this.storeWith = store;
        return this;
    }

    /** Where its value is seen; the value itself when it is a string and this is unset. */
    preview(url: FileUrl) {
        this.urlOf = url;
        return this;
    }

    override get storage() {
        return this.storeWith;
    }

    override get urlResolver() {
        return this.urlOf;
    }

    override toSchema(): FieldSchema {
        return {
            ...super.toSchema(),
            upload: { accept: this.accepted, maxSize: this.largest },
        };
    }
}

/** A relation, listed by the related entity's resource or the one given: `HasMany.make('comments', 'Replies', CommentResource)`. */
export abstract class RelationField extends Field {
    private readonly related?: ResourceClass;

    constructor(attribute: string, label?: string, resource?: ResourceClass) {
        super(attribute, label);
        this.related = resource;
    }

    override get resource() {
        return this.related;
    }
}

/** The record a ManyToOne or owning OneToOne relation points at, picked from its own resource. */
export class BelongsTo extends RelationField {
    readonly type = 'belongsTo';
}

/** The records of a OneToMany relation, listed on the detail page. */
export class HasMany extends RelationField {
    readonly type = 'hasMany';
    protected static override readonly hiddenOn: Page[] = [
        'index',
        'create',
        'update',
    ];
}

/** The records of a ManyToMany relation, listed, attached and detached on the detail page. */
export class BelongsToMany extends RelationField {
    readonly type = 'belongsToMany';
    protected static override readonly hiddenOn: Page[] = [
        'index',
        'create',
        'update',
    ];
}
