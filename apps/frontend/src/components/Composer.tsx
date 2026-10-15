import { ImagePlusIcon, XIcon } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FieldDescription, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { api, fileForm, IMAGE_TYPES, MAX_POST_IMAGES, type Post } from '../api';
import { useMe } from '../auth';
import { UserAvatar } from './UserAvatar';

const MAX_LENGTH = 5000;

/** Writes a post, then uploads its images to it one by one. */
export function Composer({ onCreated }: { onCreated: (post: Post) => void }) {
    const me = useMe();
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    const [previews, setPreviews] = useState<string[]>([]);

    // object urls hold the file in memory until revoked
    useEffect(() => {
        const urls = files.map((file) => URL.createObjectURL(file));

        setPreviews(urls);

        return () => {
            for (const url of urls) URL.revokeObjectURL(url);
        };
    }, [files]);

    const pick = (event: ChangeEvent<HTMLInputElement>) => {
        const picked = [...files, ...(event.target.files ?? [])];

        if (picked.length > MAX_POST_IMAGES)
            setError(`A post has at most ${MAX_POST_IMAGES} images`);
        setFiles(picked.slice(0, MAX_POST_IMAGES));
        event.target.value = '';
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError(undefined);

        try {
            const post = await api<Post>('/posts', {
                method: 'POST',
                json: { body },
            });
            const failed: string[] = [];

            // one by one, as the api takes a post's images
            for (const file of files)
                await api(`/posts/${post.id}/images`, {
                    method: 'POST',
                    form: fileForm(file),
                }).catch((failure: Error) =>
                    failed.push(`${file.name}: ${failure.message}`),
                );

            onCreated(
                files.length ? await api<Post>(`/posts/${post.id}`) : post,
            );
            setBody('');
            setFiles([]);

            if (failed.length)
                setError(
                    `Posted, but some images were not added. ${failed.join('; ')}`,
                );
        } catch (failure) {
            setError((failure as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const full = files.length >= MAX_POST_IMAGES;

    return (
        <form onSubmit={submit}>
            <Card>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex gap-3">
                        <UserAvatar user={me} size="lg" />
                        <div className="flex flex-1 flex-col gap-2">
                            <Textarea
                                aria-label="New post"
                                value={body}
                                onChange={(event) =>
                                    setBody(event.target.value)
                                }
                                placeholder={`What's on your mind, ${me.name}?`}
                                maxLength={MAX_LENGTH}
                                rows={3}
                            />
                            {body.length > MAX_LENGTH - 500 && (
                                <FieldDescription>
                                    {MAX_LENGTH - body.length} left
                                </FieldDescription>
                            )}
                        </div>
                    </div>
                    {previews.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {previews.map((url, index) => (
                                <div key={url} className="relative">
                                    <img
                                        className="aspect-square w-full rounded-lg object-cover"
                                        src={url}
                                        alt=""
                                    />
                                    <Button
                                        variant="secondary"
                                        size="icon-xs"
                                        className="absolute top-1 right-1"
                                        aria-label="Remove this image"
                                        title="Remove this image"
                                        onClick={() =>
                                            setFiles((current) =>
                                                current.filter(
                                                    (_, at) => at !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <XIcon />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    {error && <FieldError>{error}</FieldError>}
                </CardContent>
                <CardFooter className="justify-between">
                    <Button
                        variant="outline"
                        nativeButton={false}
                        disabled={full}
                        // biome-ignore lint/a11y/noLabelWithoutControl: the Button puts its text and the file input inside this label
                        render={<label htmlFor="post-images" />}
                    >
                        <ImagePlusIcon />
                        Add images
                        <input
                            id="post-images"
                            type="file"
                            className="sr-only"
                            accept={IMAGE_TYPES}
                            multiple
                            disabled={full}
                            onChange={pick}
                        />
                    </Button>
                    <Button type="submit" disabled={busy || !body.trim()}>
                        {busy && <Spinner />}
                        Post
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
