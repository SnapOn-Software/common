import { ConsoleLogger } from "../utils/consolelogger";
import { releasetypes } from "./common.types";

export interface iConfigInfo {
    BuildNumber: string;
    IsLocalDev: boolean;
    IsFastRing: boolean;
    IsProduction: boolean;
    ReleaseStatus: releasetypes;
    /** short code for product/project name, usually surrounded by [] */
    ProjectName: string;
    _configured: boolean;
}
export interface iConfigParams {
    BuildNumber: string;
    ReleaseStatus: releasetypes;
    ProjectName: string;
};
export interface iConfigResult {
    GetLogger: (name: string) => ConsoleLogger;
    /** @deprecated call GetLogger instead  */
    logger: (name: string) => ConsoleLogger;
    configInfo: iConfigInfo
}