import Script from 'next/script';
import { GTM_SCRIPT_URL } from '../shared';

type GTMProps = {
    tagId: string;
    defaultConsent: Record<string, string>;
};

export const GTM = ({ tagId, defaultConsent }: GTMProps) => {
    // Construct GTM script URL with container ID
    const gtmScriptUrl = new URL(GTM_SCRIPT_URL);
    gtmScriptUrl.searchParams.set('id', tagId);

    // Generate initialization script with consent configuration
    const gtmInitScript = `
function gtag() {dataLayer.push(arguments);}
(function(w,l){
w[l]=w[l]||[];
gtag('consent', 'default', ${JSON.stringify(defaultConsent)});
w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
})(window,'dataLayer');`;

    return (
        <>
            <Script
                id="_owow-gtm-init"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: dynamically generated script
                dangerouslySetInnerHTML={{ __html: gtmInitScript }}
            />
            <Script id="_owow-gtm" data-ntpc="GTM" src={String(gtmScriptUrl)} />
        </>
    );
};
