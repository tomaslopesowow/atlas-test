import { ImageCMS } from '@/components/content/content-image';
import type { DuoImage } from '@/payload-types';
import { Diorama } from '../../animation/components/diorama';

const LAYOUT_CLASSNAMES: Record<
    string,
    {
        image1: string;
        image2: string;
    }
> = {
    'layout-1': {
        image1: 'col-span-12 sm:col-span-3',
        image2: 'col-span-12 sm:col-span-9 sm:col-start-5',
    },
    'layout-2': {
        image1: 'col-span-12 sm:col-span-8',
        image2: 'col-span-12 sm:col-span-3 sm:col-start-10',
    },
    'layout-3': {
        image1: 'col-span-12 sm:col-span-3 self-end',
        image2: 'col-span-12 sm:col-span-9 sm:col-start-5 sm:mb-32',
    },
    'layout-4': {
        image1: 'col-span-12 sm:col-span-8 sm:mb-32',
        image2: 'col-span-12 sm:col-span-3 sm:col-start-10 self-end',
    },
} as const;

export const DuoImageClient = ({ image1, image2, gridLayout }: DuoImage) => {
    return (
        <div className="grid grid-cols-12 gap-y-4">
            <Diorama className={LAYOUT_CLASSNAMES[gridLayout].image1}>
                <ImageCMS image={image1} className="w-full" fadeIn={true} />
            </Diorama>
            <Diorama
                className={LAYOUT_CLASSNAMES[gridLayout].image2}
                depth={50}
            >
                <ImageCMS image={image2} className="w-full" fadeIn={true} />
            </Diorama>
        </div>
    );
};
