import { Type } from 'class-transformer';
import { IsInt, IsPositive, IsString, Max } from 'class-validator';
import { MAX_MODEL_ID } from '../types/types.js';

export class MediaUploadAndAttachInput {
    @IsString()
    modelType!: string;

    // an empty multipart field arrives as '', which Number() reads as 0
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Max(MAX_MODEL_ID)
    modelId!: number;

    @IsString()
    collection!: string;
}
