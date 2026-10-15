'use client';
import {
    Button,
    FieldLabel,
    TextInput,
    toast,
    useAllFormFields,
    useConfig,
    useDocumentForm,
    useField,
    useLocale,
} from '@payloadcms/ui';
import type { TextFieldClientProps } from 'payload';
import { reduceFieldsToValues } from 'payload/shared';
import type React from 'react';
import { useEffect, useState } from 'react';
import { PayloadLoader } from './payload-loader';

export const MediaDescriptionComponent: React.FC<TextFieldClientProps> = ({
    field,
    path,
}) => {
    const {
        config: {
            routes: { api: apiRoute },
        },
    } = useConfig();

    const { label } = field;
    const { value, setValue } = useField<string>({ path: path || field.name });
    const [fields, dispatchFields] = useAllFormFields();

    const targetFile = reduceFieldsToValues(fields)?.file;
    const autoGenerationDisabled =
        reduceFieldsToValues(fields)?.disableAutoGeneration;
    const restLocalesDescriptions =
        reduceFieldsToValues(fields)?.restLocalesDescriptions;

    const [isLoading, setIsLoading] = useState(false);
    const [previousTranslations, setPreviousTranslations] = useState(
        restLocalesDescriptions,
    );

    const { setProcessing } = useDocumentForm();

    const currentLocale = useLocale().code;

    const generateAltTexts = async (image: string | File) => {
        if (!image) return;
        const body = new FormData();

        body.set('image', image);

        const res = await fetch(
            `${apiRoute}/ai-media-description/generate-alt-texts`,
            {
                method: 'POST',
                body,
            },
        );

        const data = await res.json();

        if (data.error) {
            setProcessing(false);
            setIsLoading(false);
            return toast.error(data.error);
        }

        const translations = {
            ...previousTranslations,
            ...JSON.parse(data),
        };

        setPreviousTranslations(translations);

        const {
            [currentLocale]: currentLocaleDescription,
            ...updatedRestLocalesDescriptions
        } = translations;

        setValue(currentLocaleDescription);
        dispatchFields({
            type: 'UPDATE',
            path: 'restLocalesDescriptions',
            value: JSON.stringify(updatedRestLocalesDescriptions),
        });

        setProcessing(false);
        setIsLoading(false);
    };

    const initiateLoading = () => {
        setProcessing(true);
        setValue('');
        setIsLoading(true);
    };

    // Generate for all locales on new image upload
    // biome-ignore lint/correctness/useExhaustiveDependencies: fok of
    useEffect(() => {
        if (autoGenerationDisabled || !targetFile) return;

        initiateLoading();
        generateAltTexts(targetFile);
    }, [targetFile?.size]); // We use file size as it's linked to the image itself, not the title

    // Only generate for current locale on button click
    const handleClick = (e: React.MouseEvent<Element>) => {
        e.preventDefault();

        // Use targetFile if media is not saved yet, otherwise use url
        const image = targetFile || reduceFieldsToValues(fields)?.url;

        if (autoGenerationDisabled || !image) return;
        initiateLoading();
        generateAltTexts(image);
    };

    return (
        <div className="field-type media-description-field-component">
            <div className="inline-flex items-center gap-2 pb-1">
                <FieldLabel htmlFor={`field-${path}`} label={label} unstyled />
                <span>—</span>
                <Button
                    buttonStyle="icon-label"
                    className="flex font-normal underline m-0 disabled:opacity-50"
                    onClick={handleClick}
                    disabled={
                        isLoading ||
                        (!targetFile && !reduceFieldsToValues(fields)?.url)
                    }
                >
                    {value ? 'Regenerate' : 'Generate'}
                </Button>
            </div>
            <div className="relative">
                <TextInput
                    value={value}
                    onChange={setValue}
                    path={path || field.name}
                    readOnly={isLoading}
                />
                {isLoading && (
                    <PayloadLoader className="absolute top-0 right-4 h-full" />
                )}
            </div>
        </div>
    );
};
