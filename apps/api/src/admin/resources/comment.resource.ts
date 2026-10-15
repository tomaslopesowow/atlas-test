import { BelongsTo, DateTime, ID, Resource, Textarea } from '@repo/admin';
import { CommentEntity } from '../../posts/comment.entity.js';
import { csvExports } from '../actions/export-as-csv.action.js';

export class CommentResource extends Resource<CommentEntity> {
    entity = CommentEntity;
    override title = 'body';

    override fields() {
        return [
            this.make(ID),
            this.make(BelongsTo, 'post').sortable(),
            this.make(BelongsTo, 'author').sortable(),
            this.make(Textarea, 'body'),
            this.make(DateTime, 'createdAt').sortable(),
        ];
    }

    override actions() {
        return csvExports<CommentEntity>({
            filename: 'comments',
            columns: {
                ID: (comment) => comment.id,
                'Post ID': (comment) => comment.postId,
                'Author ID': (comment) => comment.authorId,
                Body: (comment) => comment.body,
                'Created at': (comment) => comment.createdAt,
            },
        });
    }
}
