# Atlas Project Specification

## Overview
Atlas is a modern web application built with a focus on scalability, maintainability, and type safety. The project follows a monorepo architecture using Turborepo, with clear separation between applications and shared libraries.

## Architecture

### Monorepo Structure
- **Root Organization**
  - `apps/`: Contains main applications
  - `packages/`: Shared libraries and configurations
  - Configuration files at root level

### Package Organization
- **Applications**
  - `apps/web`: Main web application

- **Shared Packages**
  - `typescript-config`: Shared TypeScript configuration
  - `i18n`: Internationalization package
  - `lib`: Core shared library
  - `lib-shopify`: Shopify integration library
  - `lib-payload`: PayloadCMS integration library

## Technical Stack

### Core Technologies
- **Runtime**
  - Node.js (v20 or higher)
  - TypeScript
  - React
  - Next.js
  - GraphQL
  - PayloadCMS
  - Shopify integration

### Build & Development Tools
- **Package Management**
  - PNPM (v9.14.4)
  - Workspace management

- **Build System**
  - Turborepo
  - TypeScript compiler
  - GraphQL Code Generator

- **Code Quality**
  - Biome for linting and formatting
  - Husky for git hooks
  - Conventional Commits

## Dependencies

### Frontend
- React and React DOM (latest versions)
- Next.js and next-intl
- Radix UI Icons
- React Markdown
- URQL GraphQL client

### Backend & API
- PayloadCMS
- Shopify integration
- GraphQL tooling
- TypeScript utilities

### Development Tools
- Playwright for E2E testing
- JSDOM for testing environment
- TSUP for TypeScript builds
- Vercel for deployment

## Features

### Development Features
- Hot module reloading
- Type checking
- Code generation
- Linting and formatting
- Automated testing
- Git hooks

### Application Features
- Internationalization
- E-commerce integration
- Content management
- GraphQL API
- Markdown support
- Icon system

### DevOps Features
- Infrastructure as Code (Terraform)
- Configuration management (Ansible)
- CI/CD (GitHub Actions)

## Development Requirements

### Environment Setup
- Node.js v20 or higher
- PNPM package manager
- Git for version control

### Development Workflow
1. Install dependencies: `pnpm install`
2. Start development server: `pnpm dev`
3. Run tests: `pnpm test`
4. Build project: `pnpm build`

### Code Quality Standards
- TypeScript strict mode
- Biome formatting rules
- Conventional commit messages
- Automated testing requirements

## Infrastructure

### Deployment
- Terraform for infrastructure
- Ansible for configuration

### CI/CD Pipeline
- GitHub Actions workflows
- Automated testing
- Deployment automation
- Environment management

## Security Requirements
- Environment variable management
- Secure API key handling
- Dependency vulnerability scanning
- Access control implementation

## Performance Requirements
- Optimized build process
- Efficient code splitting
- Asset optimization
- Caching strategies

## Documentation Requirements
- Code documentation
- API documentation
- Setup instructions
- Deployment guides

## Maintenance
- Regular dependency updates
- Security patches
- Performance monitoring
- Error tracking

## Support
- Error reporting
- Logging system
- Monitoring tools
- Backup procedures 