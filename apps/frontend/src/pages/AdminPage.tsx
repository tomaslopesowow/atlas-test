import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { api, type Profile, type Role } from '../api';
import { useAuth } from '../auth';

/** Who holds which role: give or take one, by user id. */
export function AdminPage() {
    const { can } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [userId, setUserId] = useState('');
    const [roleId, setRoleId] = useState<number | null>(null);
    const [user, setUser] = useState<Profile>();
    const [userRoles, setUserRoles] = useState<Role[]>([]);
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        api<Role[]>('/roles')
            .then((loaded) => {
                setRoles(loaded);
                setRoleId(
                    loaded.find(({ name }) => name === 'moderator')?.id ??
                        loaded[0]?.id ??
                        null,
                );
            })
            .catch((failure: Error) => setError(failure.message));
    }, []);

    const attempt = async (action: () => Promise<void>) => {
        setError(undefined);
        setMessage(undefined);

        try {
            await action();
        } catch (failure) {
            setError((failure as Error).message);
        }
    };

    const lookUp = (event?: FormEvent) => {
        event?.preventDefault();
        void attempt(async () => {
            const [profile, held] = await Promise.all([
                api<Profile>(`/users/${userId}`),
                api<Role[]>(`/users/${userId}/roles`),
            ]);

            setUser(profile);
            setUserRoles(held);
        });
    };

    const change = (grant: boolean) =>
        attempt(async () => {
            await api(`/users/${userId}/roles/${roleId}`, {
                method: grant ? 'PUT' : 'DELETE',
            });
            setMessage(grant ? 'Role given.' : 'Role taken back.');
            setUserRoles(await api<Role[]>(`/users/${userId}/roles`));
        });

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Roles</CardTitle>
                    <CardDescription>
                        Each role and the permissions it grants.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role</TableHead>
                                <TableHead>Permissions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium">
                                        {role.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {role.permissions?.map(
                                                ({ name }) => (
                                                    <Badge
                                                        key={name}
                                                        variant="secondary"
                                                    >
                                                        {name}
                                                    </Badge>
                                                ),
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Give or take a role
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <form className="flex items-end gap-2" onSubmit={lookUp}>
                        <Field>
                            <FieldLabel htmlFor="user-id">User id</FieldLabel>
                            <Input
                                id="user-id"
                                value={userId}
                                onChange={(event) =>
                                    setUserId(
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                                placeholder="42"
                                inputMode="numeric"
                            />
                        </Field>
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={!userId}
                        >
                            Look up
                        </Button>
                    </form>
                    {user && (
                        <p className="text-sm">
                            <Link
                                to={`/users/${user.id}`}
                                className="font-medium underline-offset-4 hover:underline"
                            >
                                {user.name}
                            </Link>{' '}
                            holds{' '}
                            {userRoles.length
                                ? userRoles.map(({ name }) => name).join(', ')
                                : 'no role'}
                            .
                        </p>
                    )}
                    {can('update:roles') && (
                        <div className="flex items-end gap-2">
                            <Field>
                                <FieldLabel>Role</FieldLabel>
                                <Select
                                    items={roles.map(({ id, name }) => ({
                                        value: id,
                                        label: name,
                                    }))}
                                    value={roleId}
                                    onValueChange={setRoleId}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pick a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem
                                                key={role.id}
                                                value={role.id}
                                            >
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Button
                                disabled={!userId || roleId === null}
                                onClick={() => change(true)}
                            >
                                Give
                            </Button>
                            <Button
                                variant="outline"
                                disabled={!userId || roleId === null}
                                onClick={() => change(false)}
                            >
                                Take back
                            </Button>
                        </div>
                    )}
                    {message && (
                        <p className="text-sm text-muted-foreground">
                            {message}
                        </p>
                    )}
                    {error && <FieldError>{error}</FieldError>}
                </CardContent>
            </Card>
        </>
    );
}
