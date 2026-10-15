import {
    Notification,
    type RenderInput,
    type ToPush,
} from '@repo/notifications';

interface PostLiked {
    postId: number;
    /** Who liked it. */
    userId: number;
    name: string;
}

export class PostLikedNotification
    extends Notification<PostLiked>
    implements ToPush<PostLiked>
{
    readonly type = 'post.liked';
    readonly channels = ['database', 'push'];

    toPush({ payload: { postId, name } }: RenderInput<PostLiked>) {
        return {
            title: 'New like',
            body: `${name} likes your post`,
            data: { postId },
        };
    }
}
