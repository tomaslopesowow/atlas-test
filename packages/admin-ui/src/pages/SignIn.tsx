import { useActionState } from 'react';
import { ErrorAlert } from '@/components/Notice';
import { ApiError, signIn } from '@/lib/api';
import { useTitle } from '@/lib/load';

/** The app's own login, whose token the panel then sends with every request. */
export function SignIn({
    notice,
    onSignedIn,
}: {
    notice: string | null;
    onSignedIn: () => void;
}) {
    // the email given comes back with the error, as a form action clears what was typed
    const [{ error, email }, submit, pending] = useActionState(
        async (_: unknown, form: FormData) => {
            const given = String(form.get('email'));
            // the API down or failing is said here, rather than taking the whole panel with it
            const failed = await signIn({
                email: given,
                password: String(form.get('password')),
            }).catch((error: unknown) =>
                error instanceof ApiError && error.message
                    ? error.message
                    : 'Could not reach the API',
            );

            if (!failed) onSignedIn();

            return { error: failed, email: given };
        },
        { error: notice, email: '' },
    );

    useTitle('Sign in');

    return (
        <main className="grid min-h-screen place-items-center p-4">
            <form
                action={submit}
                className="card grid w-full max-w-sm gap-4 p-6"
            >
                <div className="grid gap-1">
                    <h1 className="text-xl font-semibold">Sign in</h1>
                    <p className="text-sm text-muted-foreground">
                        With your account on this app.
                    </p>
                </div>
                {error && <ErrorAlert>{error}</ErrorAlert>}
                <label className="label grid gap-2">
                    Email
                    <input
                        type="email"
                        name="email"
                        defaultValue={email}
                        autoComplete="username"
                        required
                        className="input"
                    />
                </label>
                <label className="label grid gap-2">
                    Password
                    <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        required
                        className="input"
                    />
                </label>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pending}
                >
                    Sign in
                </button>
            </form>
        </main>
    );
}
