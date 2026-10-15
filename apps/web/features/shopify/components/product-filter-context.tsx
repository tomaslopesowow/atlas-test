'use client';

import { produce } from 'immer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    type ActionDispatch,
    createContext,
    type PropsWithChildren,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react';

type FilterAction<T = unknown> = {
    type: string;
    payload: T;
};

export interface ProductFilterApi {
    dispatch: ActionDispatch<
        [
            action: {
                type: string;
                payload: unknown;
            },
        ]
    >;
    state: {
        filter?: Record<string, string>;
        sort?: string;
    };
}

export const ProductFilterContext = createContext(
    {} as unknown as ProductFilterApi,
);

export const setFilterAction = (
    name: string,
    value: string,
): FilterAction<{ name: string; value: string }> => ({
    type: 'SET_FILTER',
    payload: { name, value },
});

export const setSortAction = (
    value: string,
): FilterAction<{ value?: string }> => ({
    type: 'SET_SORT',
    payload: { value },
});

export const ProductFilterProvider = ({
    children,
    initialState = {},
}: PropsWithChildren<{ initialState?: ProductFilterApi['state'] }>) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [state, dispatch] = useReducer(
        (state, action: { type: string; payload: unknown }) => {
            const nextState = produce(state, (draft) => {
                switch (action.type) {
                    case 'SET_FILTER': {
                        const { name, value } = action.payload as {
                            name: string;
                            value: string;
                        };

                        (draft.filter ??= {})[name] = value;
                        break;
                    }

                    case 'SET_SORT': {
                        const { value } = action.payload as { value?: string };
                        draft.sort = value;
                        break;
                    }
                }
            });

            return nextState;
        },
        initialState,
    );

    const value = useMemo(
        () => ({
            state,
            dispatch,
        }),
        [state],
    );

    useEffect(() => {
        // When state changes, update the URL search params
        const nextSearchParams = new URLSearchParams(searchParams.toString());

        // Update search params based on current filter state
        if (state.filter) {
            for (const [key, value] of Object.entries(state.filter)) {
                if (value) {
                    nextSearchParams.set(`filter.${key}`, value);
                } else {
                    nextSearchParams.delete(`filter.${key}`);
                }
            }
        }

        // Update search params based on current sort state
        if (state.sort) {
            nextSearchParams.set('sort', state.sort);
        } else {
            nextSearchParams.delete('sort');
        }

        // If the search params are the same, don't update the URL
        if (searchParams.toString() === nextSearchParams.toString()) return;

        router.replace(`${pathname}?${nextSearchParams.toString()}`, {
            scroll: false,
        });
    }, [state, pathname, searchParams, router]);

    return (
        <ProductFilterContext.Provider value={value}>
            {children}
        </ProductFilterContext.Provider>
    );
};

export const useProductFilter = () => {
    return useContext(ProductFilterContext);
};
