# Compare Project to Atlas

The Atlas repo is the current working directory. The user provides a project path as an argument (`$ARGUMENTS`).

1. Verify the project path exists and contains an Atlas-based structure (`apps/web`, `packages/`, etc.). If it doesn't look like an Atlas project, say so and stop.
2. State which project you're comparing and the current Atlas branch/commit.

## Core principle: Atlas must stay lean

Atlas is a minimal, generic starting point — not a feature-rich framework. The goal is not completeness; it is quality. A few well-chosen findings are worth more than a long list of borderline ones.

Things the project *removed* from Atlas are equally valuable findings — they may mean Atlas has unnecessary bloat.

## The inclusion test

For every potential finding, ask: **"Would a developer starting a new Atlas project likely want this?"**

Include it if:
- It solves a problem that comes up in most Atlas-based projects (not a special feature of this project)
- It improves an existing Atlas pattern (better placement, cleaner abstraction, improved defaults)
- It's a dependency version bump that has meaningful improvements
- It's a component that is self-contained and reusable with no assumptions about the surrounding project

Exclude it if:
- It only makes sense alongside a specific feature unique to this project (e.g. a filter button tied to a custom filter UI, a carousel built around a specific collection)
- It's a config change driven by a project-specific constraint (e.g. raising upload body size limits)
- It's a file so thin or so specific that it would be dead weight in most projects
- It's only a convention or folder addition with no reusable file to copy
- It's an email template

## Scanning checklist

Work through each of these explicitly. Don't skip a section because you assume nothing changed — actually check.

### Directory structure diff
Run `find` on both repos to compare top-level and second-level directories under `apps/web/`. Look for:
- Directories that exist in the project but not in Atlas (new structure)
- Directories that exist in Atlas but are in a different location in the project (moved)
- Pay specific attention to: `features/shadcn/`, `components/`, `utils/`, `features/animation/`

### Root and app config files
Diff these files between both repos:
`next.config.js`, `payload.config.ts`, `.env.example`, `turbo.json`, `pnpm-workspace.yaml`

### Payload collections and globals
Compare `apps/web/features/payload/collections/` and `apps/web/features/payload/globals/` between both repos.
Look for:
- New or restructured collections
- Changes to the Pages collection (parent page relationships, breadcrumb logic, template fields)
- Changes to how the Settings global is structured (e.g. data-driven generation from taxonomyConfigs vs hardcoded)
- Taxonomy collection setup differences

### Payload fields
Compare `apps/web/features/payload/fields/` between both repos. Read new or modified field files and evaluate whether they're generic.

### Animation feature
Explicitly list the contents of `apps/web/features/animation/` in both repos. Compare and flag any new components or hooks not present in Atlas (e.g. GSAP scroll animations, Lenis hooks).

### Components
Compare `apps/web/components/` between both repos. Flag self-contained, generic components. Ignore composites built around project-specific collections.

### Utility functions
Compare `apps/web/utils/` (or equivalent) between both repos.

### Packages
Compare the `packages/` directory. Flag new packages. Skip email template additions inside existing packages.

### Infrastructure and CI/CD
Diff `docker/`, `.github/`, `.ansible/`, `.terraform/`. Skip if the project is behind Atlas.

### Dependencies
Diff `package.json` files. Flag significant version bumps and broadly-useful new packages.

### Linting and TypeScript
Diff `biome.jsonc`, `tsconfig.json`, and similar config files.

## Output format

Group findings by category. For each finding:
- State the difference
- Include the relevant file path(s)
- One sentence on why it belongs in Atlas

Skip categories with no qualifying findings.

**If there are no meaningful differences, say so. Do not force findings.**

If any files are worth copying verbatim, list them at the end under **"Files to copy"** with their source paths.
