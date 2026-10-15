import { createImageField } from '../fields/image';
import { createBlock } from '../utils/create-block';

export const DistortedImageBlock = createBlock({
    slug: 'distortedImage',
    fields: [createImageField()],
});
