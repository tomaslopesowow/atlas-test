import { Injectable } from '@nestjs/common';
import {
    BelongsTo,
    DateTime,
    type DeleteRecordsInput,
    HasMany,
    Resource,
    Select,
    type Sort,
    Textarea,
} from '@repo/admin';
import { PostEntity } from '../../posts/post.entity.js';
import { PostsService } from '../../posts/posts.service.js';
import { csvExports } from '../actions/export-as-csv.action.js';

@Injectable()
export class PostResource extends Resource<PostEntity> {
    entity = PostEntity;

    constructor(private readonly postsService: PostsService) {
        super();
    }
    override title = 'body';
    override defaultSort: Sort = { field: 'createdAt', direction: 'desc' };

    override fields() {
        return [
            this.make(BelongsTo, 'author').sortable(),
            this.make(Textarea, 'body').showOnIndex(),
            this.make(Select, 'status').sortable().filterable(),
            this.make(DateTime, 'createdAt').sortable(),
            this.make(DateTime, 'updatedAt').sortable(),
            this.make(HasMany, 'comments'),
        ];
    }

    override actions() {
        return csvExports<PostEntity>({
            filename: 'posts',
            columns: {
                ID: (post) => post.id,
                'Author ID': (post) => post.authorId,
                Body: (post) => post.body,
                Status: (post) => post.status,
                'Created at': (post) => post.createdAt,
            },
        });
    }

    // through PostsService, which also removes the post's images, as no foreign key reaches them
    override async forceDelete({ keys }: DeleteRecordsInput<PostEntity>) {
        for (const id of keys)
            await this.postsService.remove({ id: Number(id) });

        return keys.length;
    }
}
