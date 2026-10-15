import get from 'lodash.get';
import type { SelectFieldServerComponent } from 'payload';

const DVDB_REFERENCE_ID_PATH = 'taxonomyData.fleet.dvdbReferenceId';

export const YachtPageTaxonomyLinkField: SelectFieldServerComponent = async ({
    value: unsafeValue,
    data,
}) => {
    // Safely extract the value: use unsafeValue if it's a string, otherwise extract from nested data using the field path
    const value: string =
        typeof unsafeValue === 'string'
            ? unsafeValue
            : get(data, DVDB_REFERENCE_ID_PATH);

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
            <p>
                This yacht page is connected to a yacht in the De Voogt
                Database.
            </p>
            <strong>How it works</strong>
            <p>
                When someone visits this yacht page on your website, the yacht
                information (specs, content, etc.) will be automatically pulled
                from the De Voogt Database in real-time.
            </p>
            <strong>To edit yacht data</strong>
            <p>
                You need to update the yacht data in the De Voogt Database, not
                here.{' '}
                <a
                    href={`https://devoogtdb.nl/ProjectPage/${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block' }}
                >
                    Open in devoogtdb.nl
                </a>
            </p>
        </div>
    );
};

export default YachtPageTaxonomyLinkField;
