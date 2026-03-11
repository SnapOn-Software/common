import { releasetypes } from "./common.types";

export interface iConfigInfo {
    BuildNumber: string;
    IsLocalDev: boolean;
    IsFastRing: boolean;
    IsProduction: boolean;
    ReleaseStatus: releasetypes;
    ProjectName: string;
}
export interface iConfigParams {
    BuildNumber: string;
    ReleaseStatus: releasetypes;
    ProjectName: string;
};