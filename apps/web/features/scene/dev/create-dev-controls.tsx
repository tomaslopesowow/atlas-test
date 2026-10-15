'use client';

import {
    type PropsWithChildren,
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useSyncExternalStore,
} from 'react';

const LOG_PREFIX = '[createDevControls]';

// ── Control descriptor types ────────────────────────────────────────────

type NumberControl = {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
};

type BooleanControl = {
    value: boolean;
    label?: string;
};

/** Bare string — rendered as a color picker (or text input) by leva */
type StringControl = string;

type ControlDescriptor = NumberControl | BooleanControl | StringControl;

type ControlGroup = Record<string, ControlDescriptor>;

type ControlSchema = Record<string, ControlGroup>;

// ── Type inference ──────────────────────────────────────────────────────

type ValueOf<D> = D extends { value: infer V }
    ? V
    : D extends string
      ? string
      : never;

type SchemaValues<S extends ControlSchema> = {
    [G in keyof S]: {
        [K in keyof S[G]]: ValueOf<S[G][K]>;
    };
};

// ── Utilities ───────────────────────────────────────────────────────────

/** Extract the `value` (or bare string) from every descriptor in the schema. */
function extractDefaults<S extends ControlSchema>(schema: S): SchemaValues<S> {
    const result = {} as Record<string, Record<string, unknown>>;
    for (const [group, controls] of Object.entries(schema)) {
        result[group] = {};
        for (const [key, descriptor] of Object.entries(controls)) {
            result[group][key] =
                typeof descriptor === 'string' ? descriptor : descriptor.value;
        }
    }
    return result as SchemaValues<S>;
}

/** camelCase → Title Case  ("waterRipple" → "Water Ripple") */
function toLabel(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
}

// ── Factory ─────────────────────────────────────────────────────────────

export function createDevControls<S extends ControlSchema>(schema: S) {
    type Values = SchemaValues<S>;

    const defaults = extractDefaults(schema);
    const groupKeys = Object.keys(schema);

    // Lazy-load the leva component — tree-shaken in production
    const LazyControls = lazy(() =>
        import('leva').then(({ useControls }) => {
            // Build a component that calls useControls once per group.
            // Hook count is fixed — groupKeys is module-scoped and immutable.
            function LevaControls({
                onChange,
            }: {
                onChange: (v: Values) => void;
            }) {
                const results = {} as Record<string, Record<string, unknown>>;
                const groupResults: Record<string, unknown>[] = [];

                for (const group of groupKeys) {
                    // biome-ignore lint/correctness/useHookAtTopLevel: trust
                    const groupValues = useControls(
                        toLabel(group),
                        schema[group] as Record<string, unknown>,
                    ) as Record<string, unknown>;
                    results[group] = groupValues;
                    groupResults.push(groupValues);
                }

                // biome-ignore lint/correctness/useExhaustiveDependencies: groupresults are the dependencies
                useEffect(() => {
                    onChange(results as unknown as Values);
                }, [onChange, ...groupResults]);

                return null;
            }

            return { default: LevaControls };
        }),
    );

    // ── External store (works across R3F reconciler boundary) ───────────

    let currentValue: Values = defaults;
    const listeners = new Set<() => void>();

    function subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    function getSnapshot(): Values {
        return currentValue;
    }

    function setValue(next: Values) {
        // Skip no-op updates (JSON equality check)
        if (JSON.stringify(next) === JSON.stringify(currentValue)) return;
        currentValue = next;
        for (const listener of listeners) listener();
    }

    // ── Public API ──────────────────────────────────────────────────────

    function Provider({
        children,
        enabled = true,
    }: PropsWithChildren<{ enabled?: boolean }>) {
        const handleChange = useCallback((next: Values) => {
            console.log(`${LOG_PREFIX} onControlsChange`, next);
            setValue(next);
        }, []);

        return (
            <>
                {enabled && (
                    <Suspense fallback={null}>
                        <LazyControls onChange={handleChange} />
                    </Suspense>
                )}
                {children}
            </>
        );
    }

    function useDevControls(): Values {
        return useSyncExternalStore(subscribe, getSnapshot, () => defaults);
    }

    return { Provider, useDevControls };
}
