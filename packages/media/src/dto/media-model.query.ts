import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { MAX_MODEL_ID } from '../types/types.js';

/** A model to list the media of, as a query string carries it: `?modelType=user&modelId=5&collection=avatar`. */
export class MediaModelQuery {
    @IsString()
    modelType!: string;

    // a query parameter arrives as a string
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Max(MAX_MODEL_ID)
    modelId!: number;

    @IsOptional()
    @IsString()
    collection?: string;
}
