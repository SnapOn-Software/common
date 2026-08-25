# Developer Guide

This guide is for contributors working on `@kwiz/common`.

The public [`README.md`](README.md) is intentionally consumer-focused. Build requirements, package architecture, export conventions, testing, and release practices belong here.

## Development Requirements

- Node.js 18.18+
- npm 9.8.1+

The published package supports Node.js 16+, but the current development toolchain requires Node.js 18.18+.

The repository currently declares:

```json
{
    "packageManager": "npm@9.5.1"
}
```

Use the repository's declared npm version when practical.

## Package Goals

`@kwiz/common` should behave like a tree-shakeable TypeScript library.

The package should provide:

- Convenient top-level imports for lightweight/common functionality
- Focused package entry points for heavier feature areas
- A static export-only root entry point
- No generated `exports-index` barrel files
- No post-build scripts that rewrite generated imports
- ESM output that modern bundlers can tree shake effectively
- CommonJS output for compatibility
- Application-agnostic shared functionality

## Repository Structure

```text
src/            TypeScript source
lib/
    esm/        Generated ES module output
    cjs/        Generated CommonJS output
    types/      Generated TypeScript declarations
    test/       Generated test output
```

All development should be performed under `src/`.

Files under `lib/` are generated build artifacts and should not be treated as source files.

## Public Package Entry Points

The supported package subpaths are defined by `package.json#exports`.

Currently:

```text
@kwiz/common
@kwiz/common/auth
@kwiz/common/crypto
@kwiz/common/sharepoint-rest
```

A source entry file does not automatically make a package subpath public. If a new supported subpath is added, update both:

1. the appropriate source entry file; and
2. `package.json#exports`.

Do not document a subpath as public unless it is actually present in the export map.

## Root Entry Point

The root entry point is:

```text
src/index.ts
```

It must remain a static export-only module.

### Preferred

```ts
export { something } from "./helpers/something";
```

or:

```ts
export * from "./helpers/something";
```

### Avoid

```ts
import { something } from "./helpers/something";

export { something };
```

Also avoid executing initialization logic from `src/index.ts`.

The root should describe the package API surface, not act as an application bootstrapper.

## Do Not Reintroduce Generated Barrels

The project previously generated `exports-index.*` files.

That workflow has been removed.

Do not reintroduce:

```text
create-ts-index
fix-folder-imports.js
reindex-project
remove-all-index-files
```

Prefer explicit exports maintained in the appropriate entry file.

## Adding a Public Export

For lightweight/common functionality intended for the root package:

```ts
// src/index.ts
export { getSomething } from "./helpers/getSomething";
```

For functionality belonging to a focused feature area, export it through that feature entry point instead.

Examples:

```text
src/auth.ts
src/crypto.ts
src/sharepoint-rest.ts
```

If you create a new public package subpath, also add it to `package.json#exports`.

Not every internal module needs to be publicly exported.

## Side Effects

The package declares side-effect metadata in `package.json`.

Current side-effectful outputs include:

```json
{
    "sideEffects": [
        "./lib/esm/config.js",
        "./lib/cjs/config.js",
        "./lib/esm/helpers/polyfill.js",
        "./lib/cjs/helpers/polyfill.js",
        "./lib/esm/utils/script.js",
        "./lib/cjs/utils/script.js",
        "./lib/esm/utils/sod.js",
        "./lib/cjs/utils/sod.js"
    ]
}
```

Assume new modules should be side-effect free unless import-time execution is genuinely required.

A side-effect-free module normally only defines or exports functions, classes, constants, and types.

If a module executes logic immediately when imported, determine whether its generated ESM/CJS outputs must be added to `package.json#sideEffects`.

Do not mark the whole package as side-effectful.

## Configuration Contract

Configuration-dependent functionality and shared logging use `config()`.

The current input contract is:

```ts
config({
    BuildNumber,
    ReleaseStatus,
    ProjectName
});
```

Example:

```ts
import { config } from "@kwiz/common";

export const { GetLogger, configInfo } = config({
    BuildNumber,
    ReleaseStatus,
    ProjectName: "[my-project]"
});
```

Do **not** pass `IsLocalDev`, `IsFastRing`, or `IsProduction`.

Those values are derived automatically from `ReleaseStatus` and exposed through `configInfo`.

Supported release values are:

```text
dev
fastring
production
npm
```

For applications with multiple independently loaded Webpack entry points, use a shared bootstrap module or an explicit initialization function so configuration occurs before dependent code runs.

## TypeScript

The package targets ES2019.

Do not change the TypeScript target solely to affect tree shaking.

The current optimization strategy relies on:

- ESM output
- Static exports
- Correct `sideEffects` metadata
- Avoiding generated barrels
- Focused package entry points
- Allowing the consuming bundler to analyze the module graph

Changes to the target should be treated as compatibility changes and tested against consuming applications.

## Installing Dependencies

```bash
npm install
```

## Building

Build ESM and CommonJS output:

```bash
npm run build
```

The build runs:

```text
npm run build:esm
npm run build:cjs
```

Individual builds:

```bash
npm run build:esm
npm run build:cjs
```

Explain TypeScript build inputs:

```bash
npm run build-explain
```

## Tests

Run the standard test suite:

```bash
npm test
```

The current test script builds CommonJS output, builds the test configuration, and runs Mocha.

The repository also exposes:

```bash
npm run unit-test
```

for the Node test-runner/tsx-based tests under `src`.

Changes to shared helpers should include tests where practical.

## Dependency Analysis

Run:

```bash
npm run check-dependencies
```

when reviewing dependency relationships or structural changes.

## Local Development

The repository supports both `yalc` and `npm link`.

### yalc

Publish the package to the local yalc store:

```bash
npm run yalc-link
```

The watch workflow runs the ESM build, CommonJS build, and yalc push helper in parallel:

```bash
npm run watch
```

### npm link

From the `common` repository:

```bash
npm run build
npm run npm-link
```

Then from the consuming project:

```bash
npm link @kwiz/common
```

After package changes, rebuild or push the package and rebuild the consuming application.

## Verifying Tree Shaking

Compilation alone is not enough for changes involving exports, imports, dependencies, or side effects.

Inspect the consuming application's bundle after significant structural changes.

Look for:

- Unexpected large sections of `@kwiz/common`
- Modules included without being imported
- Heavy feature areas reachable through unrelated imports
- Side-effectful modules preventing tree shaking
- New dependencies significantly increasing bundle size

Bundle impact should be part of review for package-structure changes.

## Dependency Guidelines

Before adding a dependency, consider whether:

- The functionality can reasonably be implemented without another package
- The dependency increases consuming bundle size
- The dependency supports tree shaking
- The dependency introduces browser or Node compatibility requirements
- It belongs in `dependencies`, `devDependencies`, or `peerDependencies`

Avoid product-specific dependencies unless the module is intentionally product-specific.

## Development Guidelines

When changing shared functionality:

- Keep reusable helpers application-agnostic
- Prefer small focused modules
- Avoid module-level execution unless required
- Keep public exports intentional
- Prefer direct exports from implementation files
- Avoid unnecessary barrel files
- Preserve backward compatibility where practical
- Avoid large dependencies for small utility functions
- Add or update tests where practical
- Build before testing in consumers
- Validate significant changes in at least one real consuming application
- Review bundle impact when changing module structure

## Before Committing

For normal package changes:

```bash
npm install
npm run build
npm test
```

For structural changes, also run:

```bash
npm run check-dependencies
```

and inspect an appropriate consuming application's bundle.

## Release Checklist

Before releasing:

- [ ] Source changes are complete
- [ ] Public exports are intentional
- [ ] `package.json#exports` matches supported package subpaths
- [ ] Generated `.d.ts` contracts match the intended public API
- [ ] No generated `exports-index` files were introduced
- [ ] New modules do not introduce unintended import-time side effects
- [ ] `sideEffects` metadata is correct
- [ ] `npm run build` succeeds
- [ ] `npm test` succeeds
- [ ] Relevant changes were validated in a consuming application
- [ ] Bundle impact was reviewed for structural/dependency changes
- [ ] Package version was updated appropriately
- [ ] The package is released using the approved repository process

## Design Principle

The package entry points should act as API surfaces, not application bootstrap code.

```text
entry point
    ↓
static exports
    ↓
implementation modules
    ↓
consumer bundler includes only reachable functionality
```

Preserving that structure is key to keeping `@kwiz/common` maintainable and tree-shakeable.

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2024 KWIZ Corp.
