import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
    Unique,
} from 'typeorm';
import { RoleEntity } from './role.entity.js';

@Entity('role_attachment')
// the subject first, so the same index serves every check, which looks up by subject
@Unique(['modelType', 'modelId', 'roleId'])
export class RoleAttachmentEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    roleId!: number;

    // lets the database drop the links of a deleted role
    @ManyToOne(
        () => RoleEntity,
        (role) => role.attachments,
        { onDelete: 'CASCADE' },
    )
    @JoinColumn({ name: 'roleId' })
    // Relation<> keeps the class out of the emitted design:type, which the import cycle can't handle
    role?: Relation<RoleEntity>;

    @Column()
    modelType!: string;

    @Column()
    modelId!: number;
}
