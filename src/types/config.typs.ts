import { ConsoleLogger } from "../utils/consolelogger";
import { releasetypes } from "./common.types";

export interface iConfigInfo {
    BuildNumber: string;
    IsLocalDev: boolean;
    IsFastRing: boolean;
    IsProduction: boolean;
    ReleaseStatus: releasetypes;
    ProjectName: string;
    _configured: boolean;
}
export interface iConfigParams {
    BuildNumber: string;
    ReleaseStatus: releasetypes;
    ProjectName: string;
};
export interface iConfigResult {
    GetLogger: typeof ConsoleLogger.get;
    /** @deprecated call GetLogger instead  */
    logger: typeof ConsoleLogger.get;
    configInfo: iConfigInfo
}