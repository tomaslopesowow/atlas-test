import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { MAX_ID } from './id.js';

export const DEFAULT_PAGE = 20;

/** A page of a newest-first list: what came before the last id of the previous page. */
export class BeforePageQuery {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Max(MAX_ID)
    before?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Max(50)
    limit?: number;
}

/** A page of an oldest-first list: what came after the last id of the previous page. */
export class AfterPageQuery {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Max(MAX_ID)
    after?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    @Max(50)
    limit?: number;
}
