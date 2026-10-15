import type { PlopTypes } from '@turbo/gen';
import { bootstrapConfig } from './bootstrap';

// Learn more about Turborepo Generators at https://turbo.build/repo/docs/core-concepts/monorepos/code-generation

export default function generator(plop: PlopTypes.NodePlopAPI): void {
    plop.setGenerator('bootstrap', bootstrapConfig);
}
