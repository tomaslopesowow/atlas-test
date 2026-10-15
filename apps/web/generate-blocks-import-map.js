import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path, { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import debounce from 'lodash.debounce';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const BLOCKS_DIR = join(dirname, 'features/blocks');
const CONFIGS_DIR = join(BLOCKS_DIR, 'configs');
const COMPONENTS_DIR = join(BLOCKS_DIR, 'components');
const CONFIGS_OUTPUT_PATH = join(BLOCKS_DIR, 'importMap.configs.js');
const COMPONENTS_OUTPUT_PATH = join(BLOCKS_DIR, 'importMap.components.js');

const USE_CLIENT_REGEX = /['"]use client['"];/;

/**
 * Get config files from configs/ directory.
 * Returns .ts files, filtered by ecommerce flag.
 */
function getConfigFiles() {
    const files = readdirSync(CONFIGS_DIR);
    const ecommerce = process.env.NEXT_PUBLIC_ECOMMERCE === 'yes';

    return files.filter((file) => {
        if (!file.endsWith('.ts')) return false;
        if (file.includes('.ecommerce.') && !ecommerce) return false;
        return true;
    });
}

/**
 * Get component files from components/ directory.
 * Returns .tsx files that are NOT client components, fixture files,
 * spec files, action files, or shared files.
 */
function getComponentFiles() {
    const files = readdirSync(COMPONENTS_DIR);
    const ecommerce = process.env.NEXT_PUBLIC_ECOMMERCE === 'yes';

    return files.filter((file) => {
        if (!file.endsWith('.tsx')) return false;
        if (file.includes('.ecommerce.') && !ecommerce) return false;
        if (file.includes('.client.')) return false;
        if (file.includes('.fixture.')) return false;
        if (file.includes('.spec.')) return false;
        if (file.includes('.actions.')) return false;
        if (file.includes('.shared.')) return false;
        if (file.includes('.controls.')) return false;

        // Check for "use client" directive
        const filePath = join(COMPONENTS_DIR, file);
        const content = readFileSync(filePath, 'utf-8').slice(0, 500);
        if (USE_CLIENT_REGEX.test(content)) return false;

        return true;
    });
}

function generateConfigsImportMap() {
    const files = getConfigFiles();

    let content = files
        .map((file) => `import "./configs/${basename(file, '.ts')}";`)
        .join('\n');

    content = `/* THIS FILE WAS GENERATED AUTOMATICALLY BY ATLAS. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */

${content}
`;

    writeFileSync(CONFIGS_OUTPUT_PATH, content);
    process.stdout.write('Configs import map generated.\n');
}

function generateComponentsImportMap() {
    const files = getComponentFiles();

    const entries = files
        .map(
            (file) =>
                `    '${basename(file, '.tsx')}': () => import('./components/${basename(file, '.tsx')}'),`,
        )
        .join('\n');

    const content = `/* THIS FILE WAS GENERATED AUTOMATICALLY BY ATLAS. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */

export const componentLoaders = {
${entries}
};
`;

    writeFileSync(COMPONENTS_OUTPUT_PATH, content);
    process.stdout.write('Components import map generated.\n');
}

function generateAll() {
    generateConfigsImportMap();
    generateComponentsImportMap();
}

generateAll();

if (process.env.NODE_ENV === 'development') {
    const debouncedGenerate = debounce(generateAll, 300);

    chokidar
        .watch([CONFIGS_DIR, COMPONENTS_DIR], {
            ignoreInitial: true,
            ignored:
                /(importMap\.configs\.js$|importMap\.components\.js$|\.client\.|\.shared\.|\.actions\.|\.fixture\.|\.spec\.|\.controls\.)/,
        })
        .on('change', debouncedGenerate)
        .on('add', debouncedGenerate)
        .on('unlink', debouncedGenerate);
}
