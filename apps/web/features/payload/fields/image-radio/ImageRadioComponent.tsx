'use client';

import { FieldLabel, useField } from '@payloadcms/ui';
import type { RadioFieldClientProps } from 'payload';
import './index.scss';

type Option = {
    label: string;
    value: string;
    image: string;
};

export const ImageRadioComponent: React.FC<RadioFieldClientProps> = ({
    field,
    path,
}) => {
    const { value, setValue } = useField<string>({ path: path || field.name });
    const options = field.admin?.custom?.options as Option[];

    return (
        <div className="image-radio-field">
            <FieldLabel label={field.label} />
            <div className="image-radio-options">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={`image-radio-option ${value === option.value ? 'selected' : ''}`}
                        onClick={() => setValue(option.value)}
                    >
                        {/** biome-ignore lint/performance/noImgElement: is ok */}
                        <img src={option.image} alt={option.label} />
                        <span>{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
