import { releasetypes } from "./exports-index";

export var BuildNumber = "unset";
/** release status = dev */
export var IsLocalDev = false;
/** release status = fastring */
export var IsFastRing = false;
/** release status is something else */
export var IsProduction = true;
export var ReleaseStatus: releasetypes = "npm";
export function SetDependencies(params: {
    BuildNumber?: string;
    ReleaseStatus?: releasetypes;
}) {
    if (typeof params.BuildNumber === "string") BuildNumber = params.BuildNumber;
    if (typeof params.ReleaseStatus === "string") ReleaseStatus = params.ReleaseStatus;
    IsLocalDev = ReleaseStatus === "dev";
    IsFastRing = ReleaseStatus === "fastring";
    IsProduction = ReleaseStatus !== "dev" && ReleaseStatus !== "fastring";
}