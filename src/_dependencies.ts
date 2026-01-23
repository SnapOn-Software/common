import { iConfigInfo, iConfigParams } from "./config";

export const configInfo: iConfigInfo = {
    BuildNumber: "unset",
    ReleaseStatus: "npm",
    IsLocalDev: false,
    IsFastRing: false,
    IsProduction: true,
    ProjectName: "[kw]"
}

export function SetDependencies(params: iConfigParams) {
    const BuildNumber = (typeof params.BuildNumber === "string") ? params.BuildNumber : configInfo.BuildNumber;
    const ReleaseStatus = (typeof params.ReleaseStatus === "string") ? params.ReleaseStatus : configInfo.ReleaseStatus;
    const newValue: iConfigInfo = {
        BuildNumber,
        ReleaseStatus,
        IsLocalDev: ReleaseStatus === "dev",
        IsFastRing: ReleaseStatus === "fastring",
        IsProduction: ReleaseStatus !== "dev" && ReleaseStatus !== "fastring",
        ProjectName: params.ProjectName || configInfo.ProjectName
    };

    for (const key in newValue)//update configInfo
        configInfo[key] = newValue[key];
}