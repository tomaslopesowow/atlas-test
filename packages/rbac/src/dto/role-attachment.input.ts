import { IsInt, IsPositive, IsString, Max } from 'class-validator';
import { MAX_ID } from '../types/types.js';

export class RoleAttachmentInput {
    @IsInt()
    @IsPositive()
    @Max(MAX_ID)
    roleId!: number;

    @IsString()
    modelType!: string;

    @IsInt()
    @IsPositive()
    @Max(MAX_ID)
    modelId!: number;
}
