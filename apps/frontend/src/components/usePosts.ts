import { useCallback, useEffect, useState } from 'react';
import { api, type Post } from '../api';

const PAGE = 10;

/** A newest-first list of posts from `source`, a page at a time. */
export function usePosts(source: string) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string>();

    const load = useCallback(
        async (before?: number) => {
            setLoading(true);
            setError(undefined);

            try {
                const page = await api<Post[]>(
                    `${source}?limit=${PAGE}${before ? `&before=${before}` : ''}`,
                );

                setPosts((current) => (before ? [...current, ...page] : page));
                setHasMore(page.length === PAGE);
            } catch (failure) {
                setError((failure as Error).message);
            } finally {
                setLoading(false);
            }
        },
        [source],
    );

    useEffect(() => {
        void load();
    }, [load]);

    return {
        posts,
        loading,
        hasMore,
        error,
        loadMore: () => load(posts.at(-1)?.id),
        prepend: (post: Post) => setPosts((current) => [post, ...current]),
        replace: (post: Post) =>
            setPosts((current) =>
                current.map((item) => (item.id === post.id ? post : item)),
            ),
        remove: (id: number) =>
            setPosts((current) => current.filter((item) => item.id !== id)),
    };
}
