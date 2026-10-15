import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { PermissionEntity } from './permission.entity.js';
import { RoleAttachmentEntity } from './role-attachment.entity.js';

@Entity('role')
export class RoleEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    name!: string;

    @ManyToMany(
        () => PermissionEntity,
        (permission) => permission.roles,
    )
    @JoinTable({ name: 'role_permission' })
    permissions?: PermissionEntity[];

    // lets a check join from a role to the subjects it is attached to, in one query
    @OneToMany(
        () => RoleAttachmentEntity,
        (attachment) => attachment.role,
    )
    attachments?: RoleAttachmentEntity[];
}
