# `@kwiz/common`

Shared TypeScript helpers and utilities used across KWIZ applications.

This package provides a common foundation for application configuration, logging, and reusable functionality that should behave consistently across KWIZ projects.

## Installation

Install the package in the consuming project:

```bash
npm install @kwiz/common
```

## Required Initialization

Every application must initialize `@kwiz/common` before using any of its helpers.

Call `config()` once from each independently loaded application entry point:

```ts
import { config } from "@kwiz/common";

export const { GetLogger, configInfo } = config({
    BuildNumber,   

    ReleaseStatus,

    // Identifies the consuming application in shared log output.
    ProjectName: "[cms]"
});
```

Replace `"[cms]"` with a short, recognizable identifier for the consuming project.

## Applications with Multiple Entry Points

If the project produces multiple entry bundles, each bundle that can load independently must perform this initialization.

A shared bootstrap module is recommended:

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

Import the bootstrap module before other application code:

```ts
import "./initCommon";
```

If initialization is performed only through an import for its side effect, ensure the module is not removed by tree shaking.

Mark it as a side effect in the consuming project's `package.json`, or import and call an explicit initialization function from every entry point.

For example:

```json
{
    "sideEffects": [
        "./src/initCommon.ts"
    ]
}
```

## Configuration

The configuration object supplies runtime and build information shared by the package:

| Property        | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `BuildNumber`   | Identifies the current application build.                     |
| `IsLocalDev`    | Enables verbose logging and development behavior when `true`. |
| `ReleaseStatus` | Describes the release state of the current build.             |
| `ProjectName`   | Adds a recognizable project prefix to shared log output.      |

`config()` returns the configured package services, including:

| Export       | Purpose                                                           |
| ------------ | ----------------------------------------------------------------- |
| `GetLogger`  | Creates or retrieves a logger configured for the current project. |
| `configInfo` | Exposes the normalized configuration used by the package.         |

Export these values from the bootstrap module so the rest of the application uses the same configured instances.

## Usage

After initialization, import shared helpers from the package or the project's bootstrap module as appropriate:

```ts
import { GetLogger } from "./initCommon";

const logger = GetLogger("MyService");
```

Do not initialize the package separately in ordinary feature modules. They should consume the configuration established by the application entry point.

## Development Guidelines

When adding or changing shared functionality:

* Keep helpers application-agnostic.
* Avoid introducing product-specific dependencies or behavior.
* Preserve backward compatibility wherever practical.
* Export public functionality through the package's supported entry points.
* Add or update tests for behavior shared by consuming projects.
* Verify changes in at least one consuming application before release.

## Building

Install dependencies and run the scripts defined by the repository:

```bash
npm install
npm run build
```

Run the test suite before publishing or linking the package:

```bash
npm test
```

## Consuming Local Changes

When testing package changes locally, link the package using the repository's standard local-package workflow.

Rebuild and relink after changing generated output, then restart the consuming application's development build if it does not detect the update automatically.

## Release Checklist

Before releasing a new version:

* [ ] Build the package successfully.
* [ ] Run the test suite.
* [ ] Validate the change in a consuming KWIZ project.
* [ ] Update the package version according to the scope of the change.
* [ ] Publish the package using the repository's approved release process.

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2024 KWIZ Corp.