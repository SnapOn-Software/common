import { CommonConfig } from './common-config';
import { SetPolyfills } from './helpers/polyfill';
import { iConfigInfo, iConfigParams, iConfigResult } from './types/config.typs';
import { ConsoleLogger } from './utils/consolelogger';

export function config(params: iConfigParams): iConfigResult {
    SetPolyfills();
    SetDependencies(params);
    const GetLogger = (name: string) => {
        return ConsoleLogger.get(name, CommonConfig.i.ProjectName);
    };

    return {
        GetLogger,
        /** @deprecated call GetLogger instead  */
        logger: GetLogger,
        configInfo: CommonConfig.i
    }
}

function SetDependencies(params: iConfigParams) {
    const currentConfig = CommonConfig.i;
    const BuildNumber = (typeof params.BuildNumber === "string") ? params.BuildNumber : currentConfig.BuildNumber;
    const ReleaseStatus = (typeof params.ReleaseStatus === "string") ? params.ReleaseStatus : currentConfig.ReleaseStatus;
    const newValue: iConfigInfo = {
        BuildNumber,
        ReleaseStatus,
        IsLocalDev: ReleaseStatus === "dev",
        IsFastRing: ReleaseStatus === "fastring",
        IsProduction: ReleaseStatus !== "dev" && ReleaseStatus !== "fastring",
        ProjectName: params.ProjectName || currentConfig.ProjectName,
        _configured: true
    };

    for (const key in newValue)//update configInfo
        currentConfig[key] = newValue[key];
}