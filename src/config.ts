import { configInfo, SetDependencies } from './_dependencies';
import { ConsoleLogger, logMessageValue, releasetypes } from './exports-index';

export interface iConfigInfo {
    BuildNumber: string;
    IsLocalDev: boolean;
    IsFastRing: boolean;
    IsProduction: boolean;
    ReleaseStatus: releasetypes;
    ProjectName: string;
}

/** @deprecated should only be used for 3rd party packages. main project must call config and mark it as sideEffects */
export class CommonConfig {
    private constructor() { }
    public static get i() {
        return configInfo;
    }
}

var unconfigured = true;
/** @deprecated should only be used for 3rd party packages. main project must call config and mark it as sideEffects */
export class CommonLogger {
    private name: string;
    public constructor(name: string) {
        this.name = name;
    }
    private instance: ConsoleLogger = null;
    public get i(): ConsoleLogger {
        if (this.instance === null || this.instance.context.prefix !== configInfo.ProjectName) {
            if (unconfigured) console.warn('@kwiz/common not configured yet! Call config before this code runs.');
            this.instance = ConsoleLogger.get(this.name, configInfo.ProjectName);
        }
        return this.instance;
    };

    public debug(message: any) {
        return this.i.debug(message);
    }

    public info(message: any) {
        return this.i.info(message);
    }

    public log(message: any) {
        return this.i.log(message);
    }

    /** output a message when debug is off */
    public warn(message: any) {
        return this.i.warn(message);
    }
    /** output a message when debug is off */
    public error(message: any) {
        return this.i.error(message);
    }
    /** output a message when debug is off */
    public trace(message: any) {
        return this.i.trace(message);
    }

    /**start timer on a label, call timeEnd with the same label to print out the time that passed */
    public time(label: string) {
        return this.i.time(label);
    }
    /**start timer on a label, call timeEnd with the same label to print out the time that passed */
    public timeEnd(label: string) {
        return this.i.timeEnd(label);
    }
    /**prints an array or dictionary to the console inside a group */
    public table(data: any, groupLabel?: string, groupCollapsed?: boolean) {
        return this.i.table(data, groupLabel, groupCollapsed);
    }
    /**prints a JSON object to the console inside a group */
    public json(data: any, groupLabel?: string, groupCollapsed?: boolean) {
        return this.i.json(data, groupLabel, groupCollapsed);
    }
    /**prints an XML object to the console inside a group. If data is string that looks like an XML - will try to parse it. */
    public xml(data: any, groupLabel?: string, groupCollapsed?: boolean) {
        return this.i.xml(data, groupLabel, groupCollapsed);
    }
    /** render messages inside a group, and closes the group when done. if a label is not provided - a group will not be rendered */
    public group(renderContent: () => void, label?: string, collapsed?: boolean) {
        return this.i.group(renderContent, label, collapsed);
    }

    public groupSync<ReturnType>(label: string, renderContent: (log: (message: logMessageValue) => void) => ReturnType, options?: {
        expand?: boolean;
        /** do not write to log */
        supress?: boolean;
    }) {
        return this.i.groupSync<ReturnType>(label, renderContent);
    }
    public async groupAsync<ReturnType>(label: string, renderContent: (log: (message: logMessageValue) => void) => Promise<ReturnType>, options?: {
        expand?: boolean;
        /** do not write to log */
        supress?: boolean;
    }) {
        return this.i.groupAsync<ReturnType>(label, renderContent);
    }
}

var unconfigured = true;

export interface iConfigParams {
    BuildNumber: string;
    ReleaseStatus: releasetypes;
    ProjectName: string;
};

export function config(params: iConfigParams) {
    SetDependencies(params);
    unconfigured = false;
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

/** @deprecated use configInfo instead */
export var BuildNumber = configInfo.BuildNumber;
/** @deprecated use configInfo instead */
export var IsFastRing = configInfo.IsFastRing;
/** @deprecated use configInfo instead */
export var IsLocalDev = configInfo.IsLocalDev;
/** @deprecated use configInfo instead */
export var IsProduction = configInfo.IsProduction;
/** @deprecated use configInfo instead */
export var ReleaseStatus = configInfo.ReleaseStatus;