import {
    aggregate,
    Dashboard,
    latest,
    type MetricInput,
    type MetricOptions,
    Partition,
    Table,
    Trend,
    Value,
} from '@repo/admin';
import { CommentEntity } from '../posts/comment.entity.js';
import { PostEntity } from '../posts/post.entity.js';
import { UserEntity } from '../users/user.entity.js';

const day = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
});

/** The newest posts or comments of the range, by whom and when, each linking to its record. */
class LatestMetric extends Table<PostEntity | CommentEntity> {
    private readonly resource: string;
    private readonly noun: string;

    constructor(
        options: MetricOptions<PostEntity | CommentEntity> & {
            resource: string;
            noun: string;
        },
    ) {
        super(options);
        this.resource = options.resource;
        this.noun = options.noun;
    }

    override async calculate({
        range,
        repository,
    }: MetricInput<PostEntity | CommentEntity>) {
        const [rows, { value }] = await Promise.all([
            latest({ repository, range, relations: { author: true } }),
            aggregate({ repository, range }),
        ]);

        return {
            caption: `${value.toLocaleString('en')} ${this.noun}${value === 1 ? '' : 's'} in this period`,
            rows: rows.map((row) => ({
                title: row.author?.name ?? 'Deleted user',
                subtitle: row.body,
                value: day.format(row.createdAt),
                link: { resource: this.resource, key: row.id },
            })),
        };
    }
}

/** The admin panel's home: sign-ups, posts and comments, for the range its picker sets. */
export class MainDashboard extends Dashboard {
    override cards() {
        return [
            new Value({ entity: UserEntity, label: 'Sign ups', width: '1/3' }),
            new Value({ entity: PostEntity, label: 'Posts', width: '1/3' }),
            new Value({
                entity: CommentEntity,
                label: 'Comments',
                width: '1/3',
            }),
            new Trend({
                entity: UserEntity,
                label: 'Sign ups over time',
                width: '2/3',
            }),
            new Partition({
                entity: PostEntity,
                column: 'status',
                width: '1/3',
            }),
            new LatestMetric({
                entity: PostEntity,
                label: 'Latest posts',
                resource: 'post',
                noun: 'post',
            }),
            new LatestMetric({
                entity: CommentEntity,
                label: 'Latest comments',
                resource: 'comment',
                noun: 'comment',
            }),
        ];
    }
}
