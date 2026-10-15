import { MessageSquareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
} from '@/components/ui/empty';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { PostCard } from './PostCard';
import type { usePosts } from './usePosts';

/** The posts a usePosts list holds, with a button for the next page. */
export function PostList({
    list,
    empty,
}: {
    list: ReturnType<typeof usePosts>;
    empty: string;
}) {
    const { posts, loading, hasMore, error, loadMore, replace, remove } = list;

    return (
        <section className="flex flex-col gap-6">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onChange={replace}
                    onDeleted={remove}
                />
            ))}
            {error && <FieldError>{error}</FieldError>}
            {!loading && posts.length === 0 && !error && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageSquareIcon />
                        </EmptyMedia>
                        <EmptyDescription>{empty}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
            {hasMore && (
                <Button variant="outline" disabled={loading} onClick={loadMore}>
                    {loading && <Spinner />}
                    Load more
                </Button>
            )}
            {loading && posts.length === 0 && (
                <Spinner className="mx-auto size-6" />
            )}
        </section>
    );
}
