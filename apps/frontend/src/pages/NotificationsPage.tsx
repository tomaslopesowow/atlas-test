import { BellIcon, CheckCheckIcon, CircleAlertIcon } from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemSeparator,
    ItemTitle,
} from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { api, type Notification } from '../api';
import { fullDate, timeAgo } from '../format';

/** What a notification says, and where it leads. */
const describe = ({
    type,
    payload,
}: Notification): { text: string; to?: string } => {
    const post = payload.postId ? `/posts/${payload.postId}` : undefined;

    switch (type) {
        case 'user.welcome':
            return { text: `Welcome to Atlas, ${payload.name}!` };
        case 'post.liked':
            return { text: `${payload.name} liked your post`, to: post };
        case 'post.commented':
            return {
                text: `${payload.name} commented: “${payload.excerpt}”`,
                to: post,
            };
        case 'role.granted':
            return { text: `You are now ${payload.role}`, to: '/' };
        default:
            return { text: type };
    }
};

export function NotificationsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<Notification[]>();
    const [error, setError] = useState<string>();

    const load = useCallback(async () => {
        setItems(await api<Notification[]>('/me/notifications?limit=50'));
    }, []);

    useEffect(() => {
        load().catch((failure: Error) => setError(failure.message));
    }, [load]);

    const open = async (notification: Notification) => {
        const { to } = describe(notification);

        if (!notification.readAt)
            await api('/me/notifications/read', {
                method: 'POST',
                json: { ids: [notification.id] },
            }).catch(() => undefined);

        if (to) navigate(to);
        else await load();
    };

    const readAll = async () => {
        await api('/me/notifications/read-all', { method: 'POST' });
        await load();
    };

    if (error)
        return (
            <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    if (!items) return <Spinner className="mx-auto size-6" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                {items.some(({ readAt }) => !readAt) && (
                    <CardAction>
                        <Button variant="outline" onClick={readAll}>
                            <CheckCheckIcon />
                            Mark all read
                        </Button>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent>
                {items.length === 0 && (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <BellIcon />
                            </EmptyMedia>
                            <EmptyTitle>Nothing yet</EmptyTitle>
                        </EmptyHeader>
                    </Empty>
                )}
                <ItemGroup>
                    {items.map((notification, index) => (
                        <Fragment key={notification.id}>
                            {index > 0 && <ItemSeparator />}
                            <Item
                                render={
                                    <button
                                        type="button"
                                        className="cursor-pointer text-left hover:bg-muted"
                                        onClick={() => open(notification)}
                                    />
                                }
                            >
                                <ItemContent>
                                    <ItemTitle
                                        className={
                                            notification.readAt
                                                ? 'font-normal text-muted-foreground'
                                                : undefined
                                        }
                                    >
                                        {describe(notification).text}
                                    </ItemTitle>
                                    <ItemDescription>
                                        <time
                                            title={fullDate(
                                                notification.createdAt,
                                            )}
                                        >
                                            {timeAgo(notification.createdAt)}
                                        </time>
                                    </ItemDescription>
                                </ItemContent>
                                {!notification.readAt && (
                                    <ItemActions>
                                        <Badge>New</Badge>
                                    </ItemActions>
                                )}
                            </Item>
                        </Fragment>
                    ))}
                </ItemGroup>
            </CardContent>
        </Card>
    );
}
