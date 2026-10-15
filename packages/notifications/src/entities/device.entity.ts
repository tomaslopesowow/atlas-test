import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('device')
@Index(['modelType', 'modelId'])
export class DeviceEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    modelType!: string;

    @Column()
    modelId!: number;

    // unique, so a token moves to whoever registered it last, as a phone changes accounts
    @Column({ unique: true })
    token!: string;

    /** The push provider that issued the token, e.g. `'expo'`. */
    @Column()
    provider!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;
}
