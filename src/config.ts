import { configInfo, SetDependencies } from './_dependencies';
import { ConsoleLogger, releasetypes } from './exports-index';

export interface iConfigInfo {
    BuildNumber: string;
    IsLocalDev: boolean;
    IsFastRing: boolean;
    IsProduction: boolean;
    ReleaseStatus: releasetypes;
    ProjectName: string;
}

export class GetLogger {
    private name: string;
    public constructor(name: string) {
        this.name = name;
    }
    private projectNameUsed: string = null;
    private instance: ConsoleLogger = null;
    public get i(): ConsoleLogger {
        if (this.instance === null || this.projectNameUsed !== configInfo.ProjectName) {
            this.projectNameUsed = configInfo.ProjectName;
            this.instance = GetLoggerInternal(this.name);
        }
        return this.instance;
    };
}

var GetLoggerInternal = (name: string) => {
    console.warn('@kwiz/common not configured yet! Call config before this code runs.');
    return ConsoleLogger.get(name);
};

export interface iConfigParams {
    BuildNumber: string;
    ReleaseStatus: releasetypes;
    ProjectName: string;
};

export function config(params: iConfigParams) {
    SetDependencies(params);
    //initialize it and remove the warning. prefix will automatically use configInfo.ProjectName
    GetLoggerInternal = name => ConsoleLogger.get(name);
    const GetLogger = (name: string) => {
        return ConsoleLogger.get(name, configInfo.ProjectName);
    };

    return {
        GetLogger: GetLogger,
        /** @deprecated call GetLogger instead  */
        logger: GetLogger,
        configInfo
    }
}

export class CommonConfig {
    private constructor() { }
    public static get i() {
        return configInfo;
    }
}

/** @deprecated use configInfo instead */
export const BuildNumber = configInfo.BuildNumber;
/** @deprecated use configInfo instead */
export const IsFastRing = configInfo.IsFastRing;
/** @deprecated use configInfo instead */
export const IsLocalDev = configInfo.IsLocalDev;
/** @deprecated use configInfo instead */
export const IsProduction = configInfo.IsProduction;
/** @deprecated use configInfo instead */
export const ReleaseStatus = configInfo.ReleaseStatus;