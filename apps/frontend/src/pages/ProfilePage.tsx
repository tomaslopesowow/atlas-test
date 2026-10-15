import { CircleAlertIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useState,
} from 'react';
import { useParams } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { api, fileForm, IMAGE_TYPES, type Profile } from '../api';
import { useAuth, useMe } from '../auth';
import { PostList } from '../components/PostList';
import { UserAvatar } from '../components/UserAvatar';
import { usePosts } from '../components/usePosts';

/** Change your name and picture. */
function ProfileEditor({ onSaved }: { onSaved: () => Promise<void> }) {
    const me = useMe();
    const { refresh } = useAuth();
    const [name, setName] = useState(me.name);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    const attempt = async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError(undefined);

        try {
            await action();
            await Promise.all([refresh(), onSaved()]);
        } catch (failure) {
            setError((failure as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const saveName = (event: FormEvent) => {
        event.preventDefault();
        void attempt(() => api('/me', { method: 'PATCH', json: { name } }));
    };

    const upload = (event: ChangeEvent<HTMLInputElement>) => {
        const [file] = event.target.files ?? [];

        event.target.value = '';
        if (file)
            void attempt(() =>
                api('/me/avatar', { method: 'PUT', form: fileForm(file) }),
            );
    };

    return (
        <div className="flex flex-col gap-4">
            <form className="flex items-end gap-2" onSubmit={saveName}>
                <Field>
                    <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                    <Input
                        id="profile-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={50}
                    />
                </Field>
                <Button
                    type="submit"
                    disabled={busy || !name.trim() || name.trim() === me.name}
                >
                    Save name
                </Button>
            </form>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    nativeButton={false}
                    disabled={busy}
                    // biome-ignore lint/a11y/noLabelWithoutControl: the Button puts its text and the file input inside this label
                    render={<label htmlFor="avatar-file" />}
                >
                    <UploadIcon />
                    {me.avatar ? 'Change picture' : 'Add a picture'}
                    <input
                        id="avatar-file"
                        type="file"
                        className="sr-only"
                        accept={IMAGE_TYPES}
                        disabled={busy}
                        onChange={upload}
                    />
                </Button>
                {me.avatar && (
                    <Button
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                            attempt(() =>
                                api('/me/avatar', { method: 'DELETE' }),
                            )
                        }
                    >
                        <Trash2Icon />
                        Remove picture
                    </Button>
                )}
            </div>
            {error && <FieldError>{error}</FieldError>}
        </div>
    );
}

export function ProfilePage() {
    const { id } = useParams();
    const me = useMe();
    const [profile, setProfile] = useState<Profile>();
    const [error, setError] = useState<string>();
    const list = usePosts(`/users/${id}/posts`);

    const load = useCallback(async () => {
        setProfile(await api<Profile>(`/users/${id}`));
    }, [id]);

    useEffect(() => {
        setProfile(undefined);
        load().catch((failure: Error) => setError(failure.message));
    }, [load]);

    if (error)
        return (
            <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    if (!profile) return <Spinner className="mx-auto size-6" />;

    const mine = profile.id === me.id;

    return (
        <>
            <Card>
                <CardHeader className="flex items-center gap-4">
                    <UserAvatar
                        user={profile}
                        size="lg"
                        image="medium"
                        className="size-16"
                    />
                    <div className="flex flex-col gap-1">
                        <CardTitle className="text-2xl">
                            {profile.name}
                        </CardTitle>
                        <CardDescription>
                            Joined{' '}
                            {new Date(profile.createdAt).toLocaleDateString()}
                        </CardDescription>
                    </div>
                </CardHeader>
                {mine && (
                    <CardContent className="flex flex-col gap-4">
                        <Separator />
                        <ProfileEditor onSaved={load} />
                    </CardContent>
                )}
            </Card>
            <PostList
                list={list}
                empty={mine ? "You haven't posted yet." : 'No posts yet.'}
            />
        </>
    );
}
