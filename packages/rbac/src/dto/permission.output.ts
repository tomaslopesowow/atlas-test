import { PermissionEntity } from '../entities/permission.entity.js';

export class PermissionOutput {
    id!: number;
    name!: string;
}

export function toPermissionOutput(
    permission: PermissionEntity,
): PermissionOutput {
    return {
        id: permission.id,
        name: permission.name,
    };
}
