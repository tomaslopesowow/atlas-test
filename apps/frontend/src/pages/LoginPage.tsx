import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../auth';

type Mode = 'login' | 'register';

export function LoginPage() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError(undefined);

        try {
            if (mode === 'login') await login(email, password);
            else await register(email, password, name);
        } catch (failure) {
            setError((failure as Error).message);
            setBusy(false);
        }
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-12">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Atlas</CardTitle>
                    <CardDescription>
                        {mode === 'login'
                            ? 'Sign in to your account.'
                            : 'Create an account to start posting.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit}>
                        <FieldGroup>
                            <Tabs
                                value={mode}
                                onValueChange={(value) => {
                                    setMode(value as Mode);
                                    setError(undefined);
                                }}
                            >
                                <TabsList className="w-full">
                                    <TabsTrigger value="login">
                                        Sign in
                                    </TabsTrigger>
                                    <TabsTrigger value="register">
                                        Create account
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            {mode === 'register' && (
                                <Field>
                                    <FieldLabel htmlFor="name">Name</FieldLabel>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(event) =>
                                            setName(event.target.value)
                                        }
                                        maxLength={50}
                                        required
                                        autoComplete="name"
                                    />
                                </Field>
                            )}
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    required
                                    autoComplete="email"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">
                                    Password
                                </FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    minLength={
                                        mode === 'register' ? 8 : undefined
                                    }
                                    maxLength={128}
                                    required
                                    autoComplete={
                                        mode === 'register'
                                            ? 'new-password'
                                            : 'current-password'
                                    }
                                />
                                {mode === 'register' && (
                                    <FieldDescription>
                                        At least 8 characters.
                                    </FieldDescription>
                                )}
                            </Field>
                            {error && <FieldError>{error}</FieldError>}
                            <Button type="submit" size="lg" disabled={busy}>
                                {busy && <Spinner />}
                                {mode === 'login'
                                    ? 'Sign in'
                                    : 'Create account'}
                            </Button>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
