import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import debounce from 'lodash.debounce';
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const WATCH_DIR = join(dirname, 'components/blocks');
const OUTPUT_PATH = join(dirname, 'components/blocks/importMap.js');

function generateImportMap() {
    const files = readdirSync(WATCH_DIR);

    let importMapContent = files
        .filter((file) => {
            // valid patterns:
            // component.tsx
            // component.ecommerce.tsx
            // component.client.tsx
            // component.ecommerce.client.tsx

            const ecommerce = process.env.NEXT_PUBLIC_ECOMMERCE === 'yes';

            // ignore non-tsx files
            if (!file.endsWith('.tsx')) return false;

            // ignore ecommerce blocks when NEXT_PUBLIC_ECOMMERCE is disabled
            if (file.includes('.ecommerce.') && !ecommerce) return false;

            const filePath = join(WATCH_DIR, file);
            const fileContent = readFileSync(filePath, 'utf-8');
            const firstLine = fileContent.split('\n')[0];
            const isClientComponent = /['"]use client['"];/.test(firstLine);

            // ignore client components
            if (isClientComponent) return false;

            return true;
        })
        .map((file) => `import "./${basename(file, '.tsx')}";`)
        .join('\n');

    importMapContent = `/* THIS FILE WAS GENERATED AUTOMATICALLY BY ATLAS. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */

${importMapContent}
`;

    writeFileSync(OUTPUT_PATH, importMapContent);
    process.stdout.write('Blocks import map generated.\n');
}

const debouncedGenerateImportMap = debounce(generateImportMap, 300);

chokidar
    .watch(WATCH_DIR, {
        ignoreInitial: true,
        ignored: /importMap\.js$/, // Ignore the generated importMap.js file
    })
    .on('change', debouncedGenerateImportMap);
