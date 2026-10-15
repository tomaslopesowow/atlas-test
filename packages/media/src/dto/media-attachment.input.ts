import { IsInt, IsPositive, IsString, IsUUID, Max } from 'class-validator';
import { MAX_MODEL_ID } from '../types/types.js';

export class MediaAttachmentInput {
    @IsUUID('7')
    mediaId!: string;

    @IsString()
    modelType!: string;

    @IsInt()
    @IsPositive()
    @Max(MAX_MODEL_ID)
    modelId!: number;
}
