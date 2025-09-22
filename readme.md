# KWIZ Common Repo

A collection of common helpers and utilities used across KWIZ projects

To get started, configure our modules to your project by calling config:

you must call this from every entry point of your project, best to mark it as sideEffects if using webpack or wrap in an "initConfig" function

```
import { config } from "@kwiz/common";
export const { GetLogger,configInfo } = config({
    BuildNumber: BuildNumber,
    //send true to have verbose logs and turn on debug mode
    IsLocalDev: IsLocalDev,
    ReleaseStatus: ReleaseStatus,
    //prefix logger with your project name
    ProjectName: "[cms]"
});
```
