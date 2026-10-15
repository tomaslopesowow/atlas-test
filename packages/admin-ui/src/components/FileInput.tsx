import type { FieldSchema, FileValue } from '@repo/admin-contract';
import { useEffect, useRef, useState, useTransition } from 'react';
import { uploadFile } from '@/lib/api';
import { fileInput } from '@/lib/form-values';

/** Uploads a file as soon as it is picked and submits the value that comes back, never the file itself. */
export function FileInput({
    id,
    resource,
    field,
    defaultFile,
    invalid,
    describedBy,
}: {
    id: string;
    resource: string;
    field: FieldSchema;
    defaultFile: FileValue | null;
    invalid: boolean;
    describedBy?: string;
}) {
    const [file, setFile] = useState(defaultFile);
    const [error, setError] = useState<string>();
    const [uploading, startUploading] = useTransition();
    const picker = useRef<HTMLInputElement>(null);
    const accept = field.upload?.accept.join(',') || undefined;

    // a save before the upload is done would keep the file before it, so the form waits; not
    // disabled meanwhile, as a disabled input is never checked
    useEffect(() => {
        picker.current?.setCustomValidity(
            uploading ? 'Wait for the upload to finish' : '',
        );
    }, [uploading]);

    return (
        <div className="grid gap-2">
            {file?.url &&
                (file.image ? (
                    <img
                        src={file.url}
                        alt={file.name ?? ''}
                        className="size-16 rounded-md border object-cover"
                    />
                ) : (
                    <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link w-fit"
                    >
                        {file.name ?? file.url}
                    </a>
                ))}

            <div className="flex flex-wrap items-center gap-2">
                <input
                    ref={picker}
                    id={id}
                    type="file"
                    className="input h-auto flex-1 py-1.5 file:mr-3 file:rounded-sm file:border-0 file:bg-secondary file:px-2 file:py-0.5 file:text-sm file:font-medium file:text-secondary-foreground"
                    accept={accept}
                    aria-invalid={invalid || Boolean(error)}
                    aria-describedby={describedBy}
                    onChange={(event) => {
                        const picked = event.currentTarget.files?.[0];
                        if (!picked) return;

                        startUploading(async () => {
                            // a failed upload is said by the input, rather than taking the form down with it
                            try {
                                const result = await uploadFile(
                                    resource,
                                    field.name,
                                    picked,
                                );

                                if ('data' in result) {
                                    setFile(result.data);
                                    setError(undefined);
                                } else
                                    setError(
                                        result.errors[field.name]?.join(' ') ??
                                            result.message,
                                    );
                            } catch (failed) {
                                setError(
                                    failed instanceof Error
                                        ? failed.message
                                        : 'The file could not be uploaded',
                                );
                            }
                        });
                    }}
                />
                {uploading && (
                    <span className="text-sm text-muted-foreground">
                        Uploading…
                    </span>
                )}
                {field.nullable && file && !uploading && (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setFile(null)}
                    >
                        Remove
                    </button>
                )}
            </div>

            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}

            {/* left empty, a nullable field is cleared, as the form reads it */}
            <input
                type="hidden"
                name={field.name}
                value={file ? JSON.stringify(file.value) : ''}
            />
            <input
                type="hidden"
                name={fileInput(field.name)}
                value={file ? JSON.stringify(file) : ''}
            />
        </div>
    );
}
