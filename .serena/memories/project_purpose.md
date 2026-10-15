# Project Purpose

This is "Atlas" - a full-stack web application built with Next.js 15 and PayloadCMS 3.35. It's a modern monorepo project that serves as a comprehensive content management system with optional e-commerce capabilities.

## Key Features
- **Content Management**: PayloadCMS for backend content management
- **Frontend**: Next.js 15 with App Router and React 19
- **E-commerce**: Optional Shopify integration
- **Block System**: Dynamic content blocks system
- **Internationalization**: Multi-language support with next-intl
- **Infrastructure**: Automated deployment to DigitalOcean using Terraform/OpenTofu

## Architecture
- **Monorepo**: pnpm workspaces with Turbo for build orchestration
- **Apps**: Main web application in `apps/web`
- **Packages**: Shared libraries for i18n, utilities, and TypeScript configs
- **Infrastructure**: Terraform/OpenTofu configurations for DigitalOcean deployment
- **CI/CD**: GitHub Actions workflows for automated deployment