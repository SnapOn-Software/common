# Developer Guide

This document describes how to work with `@kwiz/common`, how the package is structured, and the conventions that should be followed when adding or modifying shared functionality.

## Package Goals

`@kwiz/common` is intended to behave like a proper tree-shakeable TypeScript library.

The package should provide:

- Convenient top-level imports from `@kwiz/common`
- A root entry point containing exports only
- No runtime imports from the root `index.ts`
- No generated `exports-index` barrel files
- No post-build scripts that rewrite generated imports
- ESM output that Webpack can tree shake effectively
- CJS output for compatibility where required
- Shared functionality that remains application-agnostic

A consuming application should be able to write:

```ts
import {
    GetList,
    CreateField,
    isNullOrEmptyString
} from "@kwiz/common";
```

without forcing unrelated parts of the package into the final application bundle.

---

## Repository Structure

The important package directories are:

```text
src/
lib/
    esm/
    cjs/
    types/
    test/
```

### `src/`

Contains the TypeScript source code.

All development should be performed here.

### `lib/esm/`

Generated ES module output.

This is the primary output used by modern bundlers such as Webpack.

### `lib/cjs/`

Generated CommonJS output.

This exists for compatibility with consumers that still require CommonJS modules.

### `lib/types/`

Generated TypeScript declaration files.

### `lib/test/`

Generated output used by the test configuration.

Files under `lib/` are build artifacts and should not be treated as source files.

---

## Root Entry Point

The root package entry point is:

```text
src/index.ts
```

It must remain a **static export-only file**.

### Correct

```ts
export { GetList } from "./sharepoint/lists/GetList";
export { CreateField } from "./sharepoint/fields/CreateField";
export { isNullOrEmptyString } from "./utils/string";
```

### Avoid

```ts
import GetList from "./sharepoint/lists/GetList";

export { GetList };
```

Also avoid code such as:

```ts
import { default as _script } from "./utils/script";

export const script = _script;
```

The root entry point should not execute imports simply to re-export their values.

Static exports give Webpack and other bundlers the clearest module graph possible and improve tree shaking.

---

## Do Not Reintroduce Generated Barrels

The project previously generated files named:

```text
exports-index.*
```

These files were removed and should not be reintroduced.

Do not add generated export barrels under:

```text
src/
lib/esm/
lib/cjs/
lib/types/
lib/test/
```

The package previously used tooling around these generated indexes, including:

```text
create-ts-index
fix-folder-imports.js
```

That workflow has been removed.

The following scripts should not be recreated:

```text
reindex-project
remove-all-index-files
```

Exports should instead be maintained explicitly in `src/index.ts`.

---

## Adding a New Public Export

When adding functionality that should be available through:

```ts
import { Something } from "@kwiz/common";
```

add the implementation to the appropriate source folder and explicitly export it from `src/index.ts`.

For example:

```text
src/
    helpers/
        getSomething.ts
```

```ts
// src/helpers/getSomething.ts

export function getSomething() {
    // ...
}
```

Then add:

```ts
// src/index.ts

export { getSomething } from "./helpers/getSomething";
```

Prefer direct exports from the actual implementation module.

Avoid creating additional barrel files unless there is a specific architectural reason for one.

---

## Internal Modules

Not every module needs to be exported from the package root.

If a helper exists only to support another module internally, leave it internal.

For example:

```text
src/
    helpers/
        publicHelper.ts
        internalHelper.ts
```

If consumers only need `publicHelper`, export only that module:

```ts
export { publicHelper } from "./helpers/publicHelper";
```

This keeps the public API intentional and reduces the number of modules that consumers can accidentally depend on.

---

## Side Effects

The package declares side-effect metadata in `package.json`.

Current side-effectful modules include:

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

This metadata tells bundlers that most modules are safe to remove when they are not imported.

### When adding new modules

Assume new modules should be side-effect free.

A module is generally side-effect free if importing it only defines functions, classes, constants, or types.

For example:

```ts
export function add(a: number, b: number) {
    return a + b;
}
```

This is safe.

Be careful with modules that execute logic immediately when imported.

For example:

```ts
window.someGlobalValue = true;
```

or:

```ts
registerSomething();
```

or:

```ts
loadPolyfills();
```

These are side effects.

If a new module must perform work at import time, determine whether it needs to be added to the `sideEffects` list in `package.json`.

Do not mark the entire package as side-effectful unless absolutely necessary.

---

## Configuration

Applications consuming `@kwiz/common` must initialize the package using `config()`.

Example:

```ts
import { config } from "@kwiz/common";

export const { GetLogger, configInfo } = config({
    BuildNumber,
    IsLocalDev,
    ReleaseStatus,
    ProjectName: "[cms]"
});
```

Each independently loaded application entry point must ensure configuration has occurred before using helpers that depend on it.

For applications with multiple Webpack entry points, a shared bootstrap module is recommended.

```ts
// initCommon.ts

import { config } from "@kwiz/common";

export const { GetLogger, configInfo } = config({
    BuildNumber,
    IsLocalDev,
    ReleaseStatus,
    ProjectName: "[my-project]"
});
```

Then import it from each application entry point:

```ts
import "./initCommon";
```

If a bootstrap module is imported only for its side effect, ensure the consuming application does not remove it during tree shaking.

---

## TypeScript Configuration

The TypeScript target remains:

```json
{
    "target": "es2019"
}
```

Do not change the target simply to improve bundling or tree shaking.

The current library optimization relies primarily on:

- ESM output
- Static exports
- Correct `sideEffects` metadata
- Avoiding generated barrel modules
- Allowing the consuming bundler to analyze the module graph

Any change to the TypeScript target should be treated as a separate compatibility decision and tested against all consuming applications.

---

## Building the Package

Install dependencies:

```bash
npm install
```

Build the package:

```bash
npm run build
```

The standard build runs:

```json
{
    "build": "npm run build:esm && npm run build:cjs"
}
```

The build should not require export-index generation or post-processing scripts.

---

## Tests

Run the test suite before publishing or validating package changes:

```bash
npm test
```

Changes to shared helpers should include corresponding tests where practical.

Because this package is consumed by multiple applications, small regressions can affect several products at once.

---

## Testing Changes in AppsWeb

The recommended local workflow is to build and link `@kwiz/common`.

From the `common` repository:

```bash
npm install
npm run build
npm link
```

Then from AppsWeb:

```bash
npm link @kwiz/common
```

Run the consuming application normally, or generate the Webpack bundle report:

```bash
npm run production:analyze
```

This allows you to verify both functionality and bundle impact.

---

## Verifying Tree Shaking

When validating changes to the package, do not only verify that AppsWeb compiles.

Also inspect the generated bundle.

For example, if AppsWeb imports:

```ts
import {
    GetList,
    CreateField,
    isNullOrEmptyString
} from "@kwiz/common";
```

the resulting bundle should not automatically include every unrelated module from `@kwiz/common`.

Use:

```bash
npm run production:analyze
```

and inspect the Webpack bundle report.

When reviewing the report, look for:

- Unexpected large sections of `@kwiz/common`
- Modules that are included without being imported
- Entire folders being pulled in through barrel files
- Side-effectful modules preventing tree shaking
- New dependencies that significantly increase bundle size

Bundle size should be treated as part of the review criteria for changes to shared library structure.

---

## Development Guidelines

When adding or changing shared functionality:

- Keep code application-agnostic
- Do not introduce AppsWeb-, Forms-, CMS-, DVP-, or other product-specific behavior into generic helpers
- Prefer small focused modules
- Avoid module-level execution unless required
- Keep public exports intentional
- Prefer direct exports from implementation files
- Avoid unnecessary barrel files
- Preserve backward compatibility wherever practical
- Avoid introducing large dependencies for small utility functions
- Add tests for reusable behavior
- Build the package before testing it in consuming applications
- Verify significant changes in at least one real consumer

---

## Dependency Guidelines

Because `@kwiz/common` is shared across multiple applications, adding a dependency has a larger impact than adding one to a single application.

Before adding a dependency, consider whether:

- The functionality can reasonably be implemented without another package
- The dependency will increase consuming bundle sizes
- The dependency already exists elsewhere in the KWIZ application stack
- The dependency supports tree shaking
- The dependency introduces browser or runtime compatibility requirements
- The dependency belongs in `dependencies`, `devDependencies`, or `peerDependencies`

Avoid adding product-specific libraries to `@kwiz/common`.

---

## Before Committing

For normal package changes:

```bash
npm install
npm run build
npm test
```

Then validate the package in a consuming application when appropriate.

For changes involving package structure, exports, dependencies, or side effects, also run an AppsWeb bundle analysis:

```bash
npm run production:analyze
```

---

## Release Checklist

Before releasing a new version:

- [ ] Source changes are complete
- [ ] Public exports are correctly defined in `src/index.ts`
- [ ] No generated `exports-index` files were introduced
- [ ] New modules do not introduce unintended import-time side effects
- [ ] `sideEffects` metadata is updated if required
- [ ] `npm run build` succeeds
- [ ] `npm test` succeeds
- [ ] Changes have been validated in a consuming KWIZ application
- [ ] Bundle impact has been reviewed for structural or dependency changes
- [ ] Package version has been updated appropriately
- [ ] The package is released using the approved repository release process

---

## Design Principle

The package root should act as an API surface, not as an application bootstrapper.

In general:

```text
src/index.ts
    ↓
static exports
    ↓
individual implementation modules
    ↓
Webpack includes only what the consuming application actually needs
```

Keeping that structure intact is important to preserving the tree-shaking improvements made to `@kwiz/common`.

---

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2024 KWIZ Corp.