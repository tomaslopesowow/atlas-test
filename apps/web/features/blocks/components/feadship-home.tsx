import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { HomepageScene } from './feadship-home.client';

defineBlockComponent({
    slug: 'feadship-home',
    component: ({ block }) => {
        return (
            <>
                <div id="scroller" style={{ height: '300vh' }} />
                <div className="fixed size-full inset-0">
                    <HomepageScene block={block} />
                </div>
            </>
        );
    },
});
