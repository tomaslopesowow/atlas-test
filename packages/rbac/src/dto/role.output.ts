import { RoleEntity } from '../entities/role.entity.js';
import { PermissionOutput, toPermissionOutput } from './permission.output.js';

export class RoleOutput {
    id!: number;
    name!: string;
    permissions?: PermissionOutput[];
}

export function toRoleOutput(role: RoleEntity): RoleOutput {
    return {
        id: role.id,
        name: role.name,
        permissions: role.permissions?.map(toPermissionOutput),
    };
}
