import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, type Comment, type Post } from '../api';
import { useAuth, useMe } from '../auth';
import { fullDate, timeAgo } from '../format';
import { UserAvatar } from './UserAvatar';

const PAGE = 20;
const MAX_LENGTH = 2000;

interface CommentsProps {
    post: Post;
    /** Told how the comment count changed, so the post's counter follows. */
    onCountChange: (change: number) => void;
}

/** A post's comments, oldest first, with a box to add one. */
export function Comments({ post, onCountChange }: CommentsProps) {
    const me = useMe();
    const { can } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    const load = useCallback(
        async (after?: number) => {
            const page = await api<Comment[]>(
                `/posts/${post.id}/comments?limit=${PAGE}${after ? `&after=${after}` : ''}`,
            );

            setComments((current) => (after ? [...current, ...page] : page));
            setHasMore(page.length === PAGE);
        },
        [post.id],
    );

    useEffect(() => {
        load().catch((failure: Error) => setError(failure.message));
    }, [load]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError(undefined);

        try {
            const comment = await api<Comment>(`/posts/${post.id}/comments`, {
                method: 'POST',
                json: { body: draft },
            });

            // shown at the end only once every earlier page is, or it would sit among the wrong ones
            if (!hasMore) setComments((current) => [...current, comment]);
            setDraft('');
            onCountChange(1);
        } catch (failure) {
            setError((failure as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (comment: Comment) => {
        if (!window.confirm('Delete this comment?')) return;

        try {
            await api(`/comments/${comment.id}`, { method: 'DELETE' });
            setComments((current) =>
                current.filter(({ id }) => id !== comment.id),
            );
            onCountChange(-1);
        } catch (failure) {
            setError((failure as Error).message);
        }
    };

    // the commenter, the post's author and moderators; the api decides again
    const canDelete = (comment: Comment) =>
        comment.author.id === me.id ||
        post.author.id === me.id ||
        can('delete:comments');

    return (
        <div className="flex flex-col gap-4">
            {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                    <UserAvatar user={comment.author} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-sm">
                            <Link
                                to={`/users/${comment.author.id}`}
                                className="font-medium hover:underline"
                            >
                                {comment.author.name}
                            </Link>
                            <time
                                className="text-muted-foreground"
                                title={fullDate(comment.createdAt)}
                            >
                                {timeAgo(comment.createdAt)}
                            </time>
                            {canDelete(comment) && (
                                <Button
                                    variant="link"
                                    size="xs"
                                    className="ml-auto text-destructive"
                                    onClick={() => remove(comment)}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                            {comment.body}
                        </p>
                    </div>
                </div>
            ))}
            {hasMore && (
                <Button
                    variant="link"
                    size="sm"
                    className="self-start"
                    onClick={() => load(comments.at(-1)?.id)}
                >
                    Show more comments
                </Button>
            )}
            <form className="flex items-center gap-2" onSubmit={submit}>
                <UserAvatar user={me} />
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a comment…"
                    maxLength={MAX_LENGTH}
                    aria-label="Comment"
                />
                <Button type="submit" disabled={busy || !draft.trim()}>
                    Reply
                </Button>
            </form>
            {error && <FieldError>{error}</FieldError>}
        </div>
    );
}
