# Code Style and Conventions

## Linting and Formatting
- **Tool**: Biome (configured in `biome.jsonc` and `biome.workspace.jsonc`)
- **TypeScript**: Strict mode enabled across all packages
- **Configuration**: Atlas-specific patterns for React, TypeScript, Next.js, and PayloadCMS

## File Organization

### Feature-Based Structure
- **Features**: `apps/web/features/` - organized by domain/feature
- **Components**: `apps/web/components/` - reusable UI components
- **Blocks**: `apps/web/components/blocks/` - CMS block components

### Block System Conventions
- **Definitions**: `apps/web/features/payload/blocks/`
- **Components**: `apps/web/components/blocks/`
- **Registry**: `apps/web/features/blocks/registry.ts`
- **Auto-generation**: Use `pnpm generate:importmap --filter web` for import maps

### PayloadCMS Conventions
- **Collections**: `apps/web/features/payload/collections/`
- **Fields**: `apps/web/features/payload/fields/`
- **Local API**: `apps/web/features/payload/local-api/`
- **Config**: `apps/web/payload.config.ts`

### Shopify Integration (Optional)
- **GraphQL Fragments**: `apps/web/features/shopify/api/fragments/`
- **Components**: `apps/web/features/shopify/components/`

## Naming Conventions
- **Files**: kebab-case for file names
- **Components**: PascalCase for React components
- **Variables**: camelCase for JavaScript/TypeScript variables
- **Constants**: UPPER_SNAKE_CASE for constants

## TypeScript Patterns
- **Type Safety**: Full TypeScript strict mode
- **GraphQL**: Use gql.tada for type-safe GraphQL queries
- **Payload Types**: Auto-generated from PayloadCMS schema

## Development Guidelines
- **Cursor Rules**: Available in `.cursor/rules/` directory
- **Code Generation**: Run `pnpm codegen` after schema changes
- **Environment**: Use `.env.local` (created from `.env.example`)

## Git Conventions
- **Commits**: Follow conventional commit format
- **Branches**: Use descriptive branch names
- **Husky**: Pre-commit hooks configured for code quality