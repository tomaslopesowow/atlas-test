import { IsInt, IsPositive, IsString, Max } from 'class-validator';

// the largest id an integer column holds; a larger one could only fail in a query
const MAX_ID = 2_147_483_647;

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
