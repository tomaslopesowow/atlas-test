import { CircleAlertIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { api, type Post } from '../api';
import { PostCard } from '../components/PostCard';

export function PostPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        setPost(undefined);
        api<Post>(`/posts/${id}`)
            .then(setPost)
            .catch((failure: Error) => setError(failure.message));
    }, [id]);

    if (error)
        return (
            <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    if (!post) return <Spinner className="mx-auto size-6" />;

    return (
        <PostCard
            post={post}
            onChange={setPost}
            onDeleted={() => navigate('/')}
            commentsOpen
        />
    );
}
