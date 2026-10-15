import {
    HeartIcon,
    MessageCircleIcon,
    PencilIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { api, imageUrl, type LikeState, type Post } from '../api';
import { useAuth, useMe } from '../auth';
import { fullDate, timeAgo } from '../format';
import { Comments } from './Comments';
import { UserAvatar } from './UserAvatar';

const MAX_LENGTH = 5000;

interface PostCardProps {
    post: Post;
    onChange: (post: Post) => void;
    onDeleted: (id: number) => void;
    /** Opens the comments from the start, as the post's own page does. */
    commentsOpen?: boolean;
}

export function PostCard({
    post,
    onChange,
    onDeleted,
    commentsOpen = false,
}: PostCardProps) {
    const me = useMe();
    const { can } = useAuth();
    const [showComments, setShowComments] = useState(commentsOpen);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(post.body);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    const mine = post.author.id === me.id;

    // every action reports its failure on the card, and leaves the post as the api has it
    const attempt = async (action: () => Promise<void>) => {
        setBusy(true);
        setError(undefined);

        try {
            await action();
        } catch (failure) {
            setError((failure as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const toggleLike = () =>
        attempt(async () => {
            const state = await api<LikeState>(`/posts/${post.id}/like`, {
                method: post.likedByMe ? 'DELETE' : 'PUT',
            });

            onChange({ ...post, ...state });
        });

    const save = () =>
        attempt(async () => {
            onChange(
                await api<Post>(`/posts/${post.id}`, {
                    method: 'PATCH',
                    json: { body: draft },
                }),
            );
            setEditing(false);
        });

    const remove = () => {
        if (window.confirm('Delete this post, its images and comments?'))
            void attempt(async () => {
                await api(`/posts/${post.id}`, { method: 'DELETE' });
                onDeleted(post.id);
            });
    };

    const removeImage = (imageId: string) =>
        attempt(async () => {
            await api(`/posts/${post.id}/images/${imageId}`, {
                method: 'DELETE',
            });
            onChange({
                ...post,
                images: post.images.filter(({ id }) => id !== imageId),
            });
        });

    return (
        <Card>
            <CardHeader className="flex items-center gap-3">
                <UserAvatar user={post.author} size="lg" />
                <div className="flex flex-col gap-0.5">
                    <CardTitle>
                        <Link
                            to={`/users/${post.author.id}`}
                            className="hover:underline"
                        >
                            {post.author.name}
                        </Link>
                    </CardTitle>
                    <CardDescription>
                        <Link
                            to={`/posts/${post.id}`}
                            className="hover:underline"
                        >
                            <time title={fullDate(post.createdAt)}>
                                {timeAgo(post.createdAt)}
                            </time>
                            {post.updatedAt !== post.createdAt && ' · edited'}
                        </Link>
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {editing ? (
                    <div className="flex flex-col gap-3">
                        <Textarea
                            aria-label="Post"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            maxLength={MAX_LENGTH}
                            rows={4}
                        />
                        <div className="flex gap-2">
                            <Button
                                disabled={busy || !draft.trim()}
                                onClick={save}
                            >
                                Save
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDraft(post.body);
                                    setEditing(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap">{post.body}</p>
                )}

                {post.images.length > 0 && (
                    <div
                        className={`grid gap-2 ${post.images.length > 1 ? 'grid-cols-2' : ''}`}
                    >
                        {post.images.map((image) => (
                            <div key={image.id} className="relative">
                                <a
                                    href={imageUrl(image.urls, 'large')}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {/* a lone image fills the card, which the square thumb is too small for */}
                                    <img
                                        className={`w-full rounded-lg object-cover ${post.images.length > 1 ? 'aspect-square' : 'max-h-128'}`}
                                        src={imageUrl(
                                            image.urls,
                                            post.images.length === 1
                                                ? 'large'
                                                : 'thumb',
                                        )}
                                        alt=""
                                        loading="lazy"
                                    />
                                </a>
                                {editing && (
                                    <Button
                                        variant="secondary"
                                        size="icon-sm"
                                        className="absolute top-2 right-2"
                                        aria-label="Remove this image"
                                        title="Remove this image"
                                        disabled={busy}
                                        onClick={() => removeImage(image.id)}
                                    >
                                        <XIcon />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {error && <FieldError>{error}</FieldError>}
            </CardContent>

            <CardContent className="-my-2 flex items-center gap-1">
                <Button
                    variant="ghost"
                    aria-label={`${post.likedByMe ? 'Unlike' : 'Like'} (${post.likeCount})`}
                    aria-pressed={post.likedByMe}
                    disabled={busy}
                    onClick={toggleLike}
                >
                    <HeartIcon
                        className={
                            post.likedByMe
                                ? 'fill-destructive text-destructive'
                                : undefined
                        }
                    />
                    {post.likeCount}
                </Button>
                <Button
                    variant="ghost"
                    aria-label={`Comments (${post.commentCount})`}
                    aria-expanded={showComments}
                    onClick={() => setShowComments((open) => !open)}
                >
                    <MessageCircleIcon />
                    {post.commentCount}
                </Button>
                <span className="flex-1" />
                {mine && !editing && (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        title="Edit"
                        onClick={() => setEditing(true)}
                    >
                        <PencilIcon />
                    </Button>
                )}
                {(mine || can('delete:posts')) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        title="Delete"
                        disabled={busy}
                        onClick={remove}
                    >
                        <Trash2Icon />
                    </Button>
                )}
            </CardContent>

            {showComments && (
                <CardFooter className="flex-col items-stretch">
                    <Comments
                        post={post}
                        onCountChange={(change) =>
                            onChange({
                                ...post,
                                commentCount: post.commentCount + change,
                            })
                        }
                    />
                </CardFooter>
            )}
        </Card>
    );
}
