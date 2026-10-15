#!/usr/bin/env node

/**
 * Wrapper that registers the loader before running Payload
 */

import { register } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Register our loader
register('./payload-loader.mjs', pathToFileURL(`${__dirname}/`));

// Import and run Payload
await import('./node_modules/payload/bin.js');
