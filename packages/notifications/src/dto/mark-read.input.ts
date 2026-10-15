import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class MarkReadInput {
    @IsArray()
    @ArrayMaxSize(100)
    @IsUUID('7', { each: true })
    ids!: string[];
}
