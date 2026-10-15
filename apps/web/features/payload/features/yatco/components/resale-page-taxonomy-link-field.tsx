import get from 'lodash.get';
import type { SelectFieldServerComponent } from 'payload';

const RESALE_REFERENCE_ID_PATH = 'taxonomyData.resale.referenceId';

export const ResalePageTaxonomyLinkField: SelectFieldServerComponent = async ({
    value: unsafeValue,
    data,
}) => {
    // Safely extract the value: use unsafeValue if it's a string, otherwise extract from nested data using the field path
    const value: string =
        typeof unsafeValue === 'string'
            ? unsafeValue
            : get(data, RESALE_REFERENCE_ID_PATH);

    if (!value) return null;

    return (
        <div
            className="field-type"
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--spacing-field) * 0.5)',
            }}
        >
            <strong>What this means</strong>
            <p>This page is connected to Yatco's resale database.</p>
            <strong>How it works</strong>
            <p>
                When someone visits this page on your website, the resale
                information (specs, content, etc.) will be automatically pulled
                from Yatco's resale database in real-time.
            </p>
            <strong>To edit yacht data</strong>
            <p>
                You need to update the resale data in Yatco's resale database,
                not here.
            </p>
        </div>
    );
};

export default ResalePageTaxonomyLinkField;
