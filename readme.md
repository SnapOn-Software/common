# `@kwiz/common`

Shared TypeScript utilities used across KWIZ applications for Microsoft 365 and SharePoint development.

`@kwiz/common` provides reusable application-agnostic helpers for configuration, logging, authentication, cryptography, SharePoint REST, collections, promises, URLs, dates, types, and other common functionality.

## Installation

```bash
npm install @kwiz/common
```

## Requirements

- Node.js 16+

The published package targets ES2019 and supports both ES modules and CommonJS.

## Application Configuration

Applications that use configuration-dependent functionality or shared logging should initialize `@kwiz/common` before those APIs are used.

```ts
import { config } from "@kwiz/common";

export const { GetLogger, configInfo } = config({
    BuildNumber,
    ReleaseStatus,
    ProjectName: "[my-project]"
});
```

### Configuration Parameters

| Property | Type | Purpose |
| --- | --- | --- |
| `BuildNumber` | `string` | Identifies the current consuming application build. |
| `ReleaseStatus` | `"dev" \| "fastring" \| "production" \| "npm"` | Identifies the runtime/release environment. |
| `ProjectName` | `string` | Prefix used to identify the consuming application in shared logging. |

Environment flags are derived automatically from `ReleaseStatus`; they are not passed to `config()`.

```ts
configInfo.IsLocalDev;
configInfo.IsFastRing;
configInfo.IsProduction;
```

The current mapping is:

| `ReleaseStatus` | `IsLocalDev` | `IsFastRing` | `IsProduction` |
| --- | ---: | ---: | ---: |
| `"dev"` | `true` | `false` | `false` |
| `"fastring"` | `false` | `true` | `false` |
| `"production"` | `false` | `false` | `true` |
| `"npm"` | `false` | `false` | `true` |

### Logging

The recommended way to obtain a logger is from the result of `config()`:

```ts
import { GetLogger } from "./initCommon";

const logger = GetLogger("MyService");

logger.debug("debug message");
logger.info("information message");
logger.warn("warning message");
logger.error("error message");
```

`config()` also returns `configInfo`, which contains the normalized shared configuration.

The legacy `logger(name)` return value is deprecated; use `GetLogger(name)` instead.

## Applications with Multiple Entry Points

If an application produces multiple independently loaded bundles, each entry point must ensure configuration has occurred before configuration-dependent code runs.

A shared bootstrap module is recommended:

```ts
// initCommon.ts
import { config } from "@kwiz/common";

export const { GetLogger, configInfo } = config({
    BuildNumber,
    ReleaseStatus,
    ProjectName: "[my-project]"
});
```

Then import it from each independently loaded entry point:

```ts
import "./initCommon";
```

If the bootstrap module is imported only for its side effect, make sure the consuming bundler does not remove it during tree shaking. For example:

```json
{
    "sideEffects": [
        "./src/initCommon.ts"
    ]
}
```

Alternatively, expose an explicit initialization function and call it from each entry point.

## Public Entry Points

The package currently exposes these supported entry points:

```text
@kwiz/common
@kwiz/common/auth
@kwiz/common/crypto
@kwiz/common/sharepoint-rest
```

### Root

Use the root package for general shared helpers, types, configuration, logging, and other common utilities:

```ts
import {
    config,
    CommonLogger,
    normalizeUrl,
    jsonParse,
    promiseAllSequential
} from "@kwiz/common";
```

The root entry point uses static exports so modern bundlers can remove unused modules.

### Authentication

```ts
import {
    AutoDiscoverTenantInfo
} from "@kwiz/common/auth";
```

### Cryptography

```ts
import {
    sign
} from "@kwiz/common/crypto";
```

### SharePoint REST

```ts
import {
    GetList
} from "@kwiz/common/sharepoint-rest";
```

Use focused entry points for heavier functionality when possible. This keeps dependencies explicit and gives consuming bundlers a cleaner module graph.

## Tree Shaking

`@kwiz/common` is published as both ESM and CommonJS and includes `sideEffects` metadata for modules that must be preserved.

For the best tree-shaking results:

- Prefer ESM in modern bundlers.
- Import only the functionality your application needs.
- Use focused package entry points for auth, crypto, and SharePoint REST functionality.
- Avoid importing unrelated modules solely for side effects.

## Package Output

The package publishes:

```text
lib/
    esm/      ES module output
    cjs/      CommonJS output
    types/    TypeScript declarations
```

The root package resolves to:

```text
ESM:        lib/esm/index.js
CommonJS:   lib/cjs/index.js
Types:      lib/types/index.d.ts
```

## Development

For repository setup, build requirements, testing, export conventions, tree-shaking guidance, and release practices, see [`development.md`](development.md).

## Repository

Source: `SnapOn-Software/common`

Issues can be reported through the GitHub repository.

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2024 KWIZ Corp.
