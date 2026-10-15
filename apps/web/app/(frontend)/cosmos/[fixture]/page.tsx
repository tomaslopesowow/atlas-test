// @ts-nocheck
import { permanentRedirect } from 'next/navigation';
import { nextCosmosPage } from 'react-cosmos-next';

// biome-ignore lint/suspicious/noExplicitAny: shut up de fuk
export default async function CosmosWrapper(props: any) {
    if (process.env.NODE_ENV !== 'development') permanentRedirect('/');
    const cosmosImports = await import('@/cosmos.imports');
    const Component = nextCosmosPage(cosmosImports);
    return (
        <html lang="en">
            <body>
                <Component params={await props.params} />
            </body>
        </html>
    );
}
