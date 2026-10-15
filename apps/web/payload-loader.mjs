import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Minimal loader that intercepts "use client" files during Payload operations
 */

// Pre-compiled regex patterns
const USE_CLIENT_REGEX = /^['"]use client['"]/;
const EXPORT_FUNCTION_REGEX = /export\s+(?:async\s+)?function\s+(\w+)/g;
const EXPORT_VARIABLE_REGEX = /export\s+(?:const|let|var)\s+(\w+)/g;
const EXPORT_CLASS_REGEX = /export\s+class\s+(\w+)/g;
const EXPORT_BRACES_REGEX = /export\s*\{([^}]+)\}/g;
const EXPORT_NAMESPACE_REGEX = /export\s*\*\s+as\s+(\w+)\s+from/g;
const EXPORT_AS_ALIAS_REGEX = /(?:\w+\s+as\s+)?(\w+)$/;

// Simple LRU cache for analyzed modules
const CACHE_SIZE = 500;
const moduleCache = new Map();

function addToCache(key, value) {
    // Simple LRU: if cache is full, delete oldest entry
    if (moduleCache.size >= CACHE_SIZE) {
        const firstKey = moduleCache.keys().next().value;
        moduleCache.delete(firstKey);
    }
    moduleCache.set(key, value);
}

function getCacheKey(filepath) {
    try {
        const stats = statSync(filepath);
        return `${filepath}:${stats.mtimeMs}`;
    } catch {
        return null;
    }
}

export async function analyzeClientModule(filepath) {
    try {
        // Check cache first
        const cacheKey = getCacheKey(filepath);
        if (cacheKey && moduleCache.has(cacheKey)) {
            return moduleCache.get(cacheKey);
        }

        const content = await readFile(filepath, 'utf-8');

        // Early exit: check for "use client" directive efficiently
        const hasUseClient = USE_CLIENT_REGEX.test(
            content.slice(0, 100).trim(),
        );

        if (!hasUseClient) {
            const result = { hasUseClient: false, namedExports: [] };
            if (cacheKey) addToCache(cacheKey, result);
            return result;
        }

        // Use Set from the beginning to avoid duplicates
        const namedExports = new Set();

        // Single pass: combine all regex operations
        // Reset regex lastIndex for global patterns
        EXPORT_FUNCTION_REGEX.lastIndex = 0;
        EXPORT_VARIABLE_REGEX.lastIndex = 0;
        EXPORT_CLASS_REGEX.lastIndex = 0;
        EXPORT_BRACES_REGEX.lastIndex = 0;
        EXPORT_NAMESPACE_REGEX.lastIndex = 0;

        let match;

        // Match: export function/const/class/let Name
        while ((match = EXPORT_FUNCTION_REGEX.exec(content)) !== null) {
            namedExports.add(match[1]);
        }
        while ((match = EXPORT_VARIABLE_REGEX.exec(content)) !== null) {
            namedExports.add(match[1]);
        }
        while ((match = EXPORT_CLASS_REGEX.exec(content)) !== null) {
            namedExports.add(match[1]);
        }

        // Match: export { Name, Name as Alias }
        while ((match = EXPORT_BRACES_REGEX.exec(content)) !== null) {
            const exports = match[1].split(',');
            for (const exp of exports) {
                const trimmed = exp.trim();
                const asMatch = trimmed.match(EXPORT_AS_ALIAS_REGEX);
                if (asMatch) {
                    namedExports.add(asMatch[1]);
                }
            }
        }

        // Match: export * as Name from
        while ((match = EXPORT_NAMESPACE_REGEX.exec(content)) !== null) {
            namedExports.add(match[1]);
        }

        const result = {
            hasUseClient: true,
            namedExports: Array.from(namedExports),
        };
        if (cacheKey) addToCache(cacheKey, result);
        return result;
    } catch {
        return { hasUseClient: false, namedExports: [] };
    }
}

// ESM loader hooks
export async function load(url, context, nextLoad) {
    // Only intercept local files
    if (url.startsWith('file://')) {
        const filepath = fileURLToPath(url);

        // Check TypeScript/JavaScript files
        if (filepath.match(/\.(tsx?|jsx?|mjs)$/)) {
            // Use async version for non-blocking I/O
            const analysis = await analyzeClientModule(filepath);

            if (analysis.hasUseClient) {
                // Optimize mock generation with array.join for better performance
                const mockExports = [];

                // Add named exports as mock functions/values (skip type exports)
                for (const exportName of analysis.namedExports) {
                    if (exportName === 'default') continue;
                    mockExports.push(`export const ${exportName} = {};`);
                }

                // Add default export
                mockExports.push('export default {};');

                // Join all exports efficiently
                const mockSource = mockExports.join('\n');

                // Return the dynamically generated mock
                return {
                    format: 'module',
                    shortCircuit: true,
                    source: mockSource,
                };
            }
        }
    }

    return nextLoad(url, context);
}
