import startCase from 'lodash.startcase';
import type { Option } from 'payload';

export function createSizeOptions(
    amount = 5,
    labels = ['none', 'small', 'medium', 'large'],
): Option[] {
    return Array.from({ length: amount }, (_, value) => {
        const sizeFactor = value - labels.length + 1;

        const parts = [
            sizeFactor > 1 ? sizeFactor : '',
            sizeFactor > 0 ? 'X-' : '',
            startCase(labels[Math.min(value, labels.length - 1)]),
        ];

        return {
            value: String(value),
            label: parts.join(''),
        };
    });
}
