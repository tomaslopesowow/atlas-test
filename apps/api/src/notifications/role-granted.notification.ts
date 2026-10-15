import {
    Notification,
    type RenderInput,
    type ToPush,
} from '@repo/notifications';

interface RoleGranted {
    role: string;
}

export class RoleGrantedNotification
    extends Notification<RoleGranted>
    implements ToPush<RoleGranted>
{
    readonly type = 'role.granted';
    readonly channels = ['database', 'push'];

    toPush({ payload }: RenderInput<RoleGranted>) {
        return {
            title: 'New role',
            body: `You are now ${payload.role}.`,
        };
    }
}
