# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `pnpm dev` - Start all development services (Next.js, PayloadCMS)
- `pnpm dev --filter web` - Start only the web app

### Building
- `pnpm build` - Build all apps and packages
- `pnpm build --filter web` - Build only the web app
- `pnpm build:packages` - Build only workspace packages

### Code Quality
- `pnpm lint` - Run Biome linting across all packages
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm typecheck` - Run TypeScript type checking

### Testing
- `pnpm test:e2e --filter web` - Run Playwright end-to-end tests
- `pnpm test:codegen --filter web` - Generate Playwright test code

### Code Generation
- `pnpm codegen` - Generate GraphQL types and Payload types
- `pnpm generate:types --filter web` - Generate PayloadCMS TypeScript types
- `pnpm generate:importmap --filter web` - Generate block import mappings

### Project Setup
- `pnpm bootstrap` - Interactive project setup wizard
- `pnpm build --filter @repo/i18n` - Required before first dev run

## Architecture Overview

### Monorepo Structure
- **apps/web**: Next.js 15 + PayloadCMS 3.35 application
- **packages/**: Shared workspace packages (email, i18n, lib, lib-shopify)
- Uses **Turbo** for build orchestration, **pnpm workspaces** for dependency management

### Web App Architecture
- **Next.js App Router** with route groups:
  - `(frontend)`: Public pages with internationalization
  - `(payload)`: PayloadCMS admin interface
- **Feature-based organization** in `apps/web/features/`
- **Block-based content system** with dynamic component resolution

### Key Technologies
- **Backend**: PayloadCMS with MongoDB, custom plugins (OTP, permissions, taxonomies)
- **Frontend**: React 19, TypeScript, TailwindCSS, shadcn/ui, Radix UI
- **E-commerce**: Shopify integration (optional, Hydrogen React, dual GraphQL APIs)
- **Animation**: GSAP premium version, Lenis smooth scroll
- **GraphQL**: URQL client with gql.tada for type safety
- **i18n**: next-intl with configurable locale strategies

### Development Patterns

#### Block System
- Blocks defined in `apps/web/features/payload/blocks/`
- Components in `apps/web/components/blocks/`
- Registry at `apps/web/features/blocks/registry.ts`
- Auto-generated import maps via `generate:importmap`

#### PayloadCMS Integration
- Collections in `apps/web/features/payload/collections/`
- Custom fields in `apps/web/features/payload/fields/`
- Local API layer in `apps/web/features/payload/local-api/`
- Config at `apps/web/payload.config.ts`

#### Shopify Integration (Optional)
- GraphQL fragments in `apps/web/features/shopify/api/fragments/`
- Components in `apps/web/features/shopify/components/`
- Enabled via environment variables

#### Internationalization
- Configuration in `packages/i18n/src/shared.ts`
- Locale detection via Next.js middleware
- Messages in `packages/i18n/src/messages/`
- Build i18n package before development: `pnpm build --filter @repo/i18n`

### Important File Locations
- **Payload config**: `apps/web/payload.config.ts`
- **Next.js config**: `apps/web/next.config.ts`
- **Block registry**: `apps/web/features/blocks/registry.ts`
- **i18n config**: `packages/i18n/src/shared.ts`
- **Environment**: `.env.local` (create from `.env.example`)

### Development Workflow
1. Install dependencies: `pnpm install`
2. Build i18n package: `pnpm build --filter @repo/i18n`
3. Run bootstrap if new project: `pnpm bootstrap`
4. Start development: `pnpm dev`
5. Run codegen after schema changes: `pnpm codegen`

### Code Quality Standards
- **Biome** for linting (config in `biome.jsonc`)
- **TypeScript strict mode** enabled
- **Cursor rules** available in `.cursor/rules/` directory
- Follows Atlas-specific patterns for React, TypeScript, Next.js, and PayloadCMS

## Production Deployment

For production deployment and infrastructure management, see the specialized documentation:

- **[Infrastructure Management](.terraform/CLAUDE.md)** - Terraform/OpenTofu setup, DigitalOcean resources, and environment provisioning
- **[Server Configuration](.ansible/CLAUDE.md)** - Ansible automation, server provisioning, and deployment orchestration
- **[CI/CD Pipelines](.github/CLAUDE.md)** - GitHub Actions workflows, automated testing, building, and deployment

### Docker Development Environment

#### Local Development
- **Start services**: `docker compose up -d`
- **Stop services**: `docker compose down`
- **Services included**:
  - **MongoDB**: Latest version on port 27017 with WiredTiger storage engine
  - **Mailpit**: Email testing tool (SMTP: 1025, Dashboard: 8025)
- **Data persistence**: MongoDB data stored in `mongodb` named volume
- **Configuration**: `docker/compose.yml`

#### Production Environment
- **Configuration**: `docker/compose.production.yml`
- **Services included**:
  - **MongoDB**: Production MongoDB with WiredTiger storage engine
  - **Nginx**: SSL-enabled reverse proxy with Let's Encrypt certificates
  - **Web**: Atlas Next.js application with health checks and rolling updates
- **SSL/HTTPS**: Automatic Let's Encrypt certificate management
- **Environment**: Uses `.env.web` for production configuration

#### Basic Docker Commands
```bash
# Development
docker compose up -d                    # Start dev services
docker compose logs -f                  # View logs
docker compose down                     # Stop services

# Local production testing
docker build --file=docker/web.Dockerfile --tag=atlas-web:latest .
docker run --publish=3000:3000 atlas-web:latest

# Production deployment (via CI/CD)
docker stack deploy --compose-file=docker/compose.production.yml atlas
```

## Additional Documentation

This repository contains specialized CLAUDE.md files for different aspects of the system:

- **[.ansible/CLAUDE.md](.ansible/CLAUDE.md)** - Ansible configuration and server automation
- **[.github/CLAUDE.md](.github/CLAUDE.md)** - GitHub Actions workflows and CI/CD
- **[.terraform/CLAUDE.md](.terraform/CLAUDE.md)** - Infrastructure as Code with OpenTofu/Terraform

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
NEVER include a Claude signature in commit messages.
