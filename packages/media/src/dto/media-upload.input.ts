import { IsString } from 'class-validator';

export class MediaUploadInput {
    @IsString()
    collectionName!: string;
}
