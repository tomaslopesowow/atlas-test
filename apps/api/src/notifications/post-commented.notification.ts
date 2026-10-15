import {
    Notification,
    type RenderInput,
    type ToPush,
} from '@repo/notifications';

interface PostCommented {
    postId: number;
    commentId: number;
    /** Who commented. */
    name: string;
    excerpt: string;
}

export class PostCommentedNotification
    extends Notification<PostCommented>
    implements ToPush<PostCommented>
{
    readonly type = 'post.commented';
    readonly channels = ['database', 'push'];

    toPush({
        payload: { postId, commentId, name, excerpt },
    }: RenderInput<PostCommented>) {
        return {
            title: `${name} commented on your post`,
            body: excerpt,
            data: { postId, commentId },
        };
    }
}
