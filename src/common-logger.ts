import { CommonConfig } from './common-config';
import { ConsoleLogger, logMessageValue } from './utils/consolelogger';

/** to be used by 3rd party apps to get the latet project config. Main project entry point will have to call config. */
export class CommonLogger {
    private name: string;
    public constructor(name: string) {
        this.name = name;
    }
    private instance: ConsoleLogger = null;
    public get i(): ConsoleLogger {
        if (this.instance === null || this.instance.context.prefix !== CommonConfig.i.ProjectName) {
            if (!CommonConfig.i._configured) console.warn('@kwiz/common not configured yet! Call config before this code runs.');
            this.instance = ConsoleLogger.get(this.name, CommonConfig.i.ProjectName);
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
