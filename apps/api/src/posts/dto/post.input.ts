import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../users/dto/user.input.js';

export class PostInput {
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    body!: string;
}

export class CommentInput {
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    body!: string;
}
