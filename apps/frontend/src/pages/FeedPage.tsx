import { Composer } from '../components/Composer';
import { PostList } from '../components/PostList';
import { usePosts } from '../components/usePosts';

export function FeedPage() {
    const list = usePosts('/posts');

    return (
        <>
            <Composer onCreated={list.prepend} />
            <PostList
                list={list}
                empty="Nothing here yet. Write the first post!"
            />
        </>
    );
}
