import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { PermissionName } from '../types/types.js';
import { RoleEntity } from './role.entity.js';

// names arrive normalised: RbacService trims and lowercases them before every write
@Entity('permission')
export class PermissionEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    name!: PermissionName;

    @ManyToMany(
        () => RoleEntity,
        (role) => role.permissions,
    )
    roles?: RoleEntity[];
}
