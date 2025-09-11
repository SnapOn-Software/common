import { BuildNumber, ReleaseStatus } from "../_dependencies";
import { getSecondsElapsed } from "../helpers/date";
import { consoleLoggerFilter, isDebug } from "../helpers/debug";
import { getGlobal, jsonClone } from "../helpers/objects";
import { padLeft, padRight } from "../helpers/strings";
import { isFunction, isNullOrEmptyString, isNullOrUndefined, isNumber, isNumeric, isString } from "../helpers/typecheckers";
import { IDictionary } from "../types/common.types";

const DEFAULT_LOGGER_NAME = "DEFAULT";
const LoggerPrefix = "[kw]";

interface ILoggerGlobal {
    loggers: IDictionary<ConsoleLogger>;
    loggedBuild: boolean;
}

// eslint-disable-next-line no-shadow
export enum LoggerLevel {
    VERBOSE = 0,
    DEBUG = 1,
    INFO = 2,
    LOG = 3,
    /** shows when debug=off */
    WARN = 4,
    /** shows when debug=off */
    TRACE = 5,
    /** shows when debug=off */
    ERROR = 6,
    OFF = 10
}

export type LoggerContext = {
    //allow to not set logger level, so it will be set by isDebug always. But - dev can set it for a specific logger instance if they want to override
    filterLevel?: LoggerLevel;
    name?: string;
    //allow to have a different prefix
    prefix?: string;
};

type logMessageValue = string | { label: string, value: Object };
type logMessage = { seconds: number, message: logMessageValue };
export class ConsoleLogger {
    public context: LoggerContext;

    protected constructor(context: LoggerContext) {
        this.context = context;
    }

    public static get(name: string, prefix?: string) {
        var global = ConsoleLogger._getGlobal();
        var loggers = global.loggers;

        if (!global.loggedBuild) {
            global.loggedBuild = true;
            console.debug(`${ConsoleLogger.commonPrefix()} KWIZ build ${ReleaseStatus}.${BuildNumber}`);
        }

        return loggers[name] || (loggers[name] = new ConsoleLogger({ name: name, prefix: prefix }));
    }

    private static _getGlobal() {
        var global: ILoggerGlobal = getGlobal("loggers", {
            loggedBuild: false,
            loggers: {}
        }, true);
        return global;
    }

    private static _getDefaultLogger() {
        return ConsoleLogger.get(DEFAULT_LOGGER_NAME);
    }

    public static setLevel(newLevel: LoggerLevel) {
        ConsoleLogger._getDefaultLogger().setLevel(newLevel);
    }

    public static getLevel() {
        return ConsoleLogger._getDefaultLogger().getLevel();
    }

    public static debug(message: any) {
        ConsoleLogger._getDefaultLogger().debug(message);
    }

    public static info(message: any) {
        ConsoleLogger._getDefaultLogger().info(message);
    }

    public static log(message: any) {
        ConsoleLogger._getDefaultLogger().log(message);
    }

    public static warn(message: any) {
        ConsoleLogger._getDefaultLogger().warn(message);
    }

    public static error(message: any) {
        ConsoleLogger._getDefaultLogger().error(message);
    }

    public static trace(message: any) {
        ConsoleLogger._getDefaultLogger().trace(message);
    }

    public static commonPrefix(prefix?: string) {
        var d = new Date();
        var timestamp = padLeft(d.getHours().toString(), 2, "0")
            + ":" + padLeft(d.getMinutes().toString(), 2, "0")
            + ":" + padLeft(d.getSeconds().toString(), 2, "0")
            + "." + padRight(d.getMilliseconds().toString(), 3, "0");

        return `[${timestamp}] ${prefix || LoggerPrefix}`;
    }
    private contextPrefix() {
        return `${ConsoleLogger.commonPrefix(this.context.prefix)} [${this.context.name}]`;
    }
    private format(message: string) {
        return `${this.contextPrefix()} ${message}`;
    }

    public setLevel(newLevel: LoggerLevel) {
        if (isNumeric(newLevel)) {
            this.context.filterLevel = newLevel;
        }
    }

    public getLevel() {
        if (isNumeric(this.context.filterLevel))
            return this.context.filterLevel;
        else return isDebug() ? LoggerLevel.VERBOSE : LoggerLevel.WARN;
    }

    public enabledFor(level: LoggerLevel) {
        if (consoleLoggerFilter().indexOf(this.context.name) >= 0) return false;
        var filterLevel = this.getLevel();
        return level >= filterLevel;
    }

    public debug(message: any) {
        this.logWithLevel(LoggerLevel.DEBUG, message);
    }

    public info(message: any) {
        this.logWithLevel(LoggerLevel.INFO, message);
    }

    public log(message: any) {
        this.logWithLevel(LoggerLevel.LOG, message);
    }

    /** output a message when debug is off */
    public warn(message: any) {
        this.logWithLevel(LoggerLevel.WARN, message);
    }
    /** output a message when debug is off */
    public error(message: any) {
        this.logWithLevel(LoggerLevel.ERROR, message);
    }
    /** output a message when debug is off */
    public trace(message: any) {
        this.logWithLevel(LoggerLevel.TRACE, message);
    }

    /**start timer on a label, call timeEnd with the same label to print out the time that passed */
    public time(label: string) {
        if (this.enabledFor(LoggerLevel.DEBUG) && isFunction(console.time))
            console.time(`[timer] [kw] [${this.context.name}] ${label}`);
    }
    /**start timer on a label, call timeEnd with the same label to print out the time that passed */
    public timeEnd(label: string) {
        if (this.enabledFor(LoggerLevel.DEBUG) && isFunction(console.timeEnd))
            console.timeEnd(`[timer] [kw] [${this.context.name}] ${label}`);
    }
    /**prints an array or dictionary to the console inside a group */
    public table(data: any, groupLabel?: string, groupCollapsed?: boolean) {
        if (this.enabledFor(LoggerLevel.DEBUG) && isFunction(console.table)) {
            this.group(() => console.table(data), groupLabel, groupCollapsed);
        }
    }
    /**prints a JSON object to the console inside a group */
    public json(data: any, groupLabel?: string, groupCollapsed?: boolean) {
        if (this.enabledFor(LoggerLevel.DEBUG) && isFunction(console.dir)) {
            this.group(() => console.dir(data), groupLabel, groupCollapsed);
        }
    }
    /**prints an XML object to the console inside a group. If data is string that looks like an XML - will try to parse it. */
    public xml(data: any, groupLabel?: string, groupCollapsed?: boolean) {
        if (this.enabledFor(LoggerLevel.DEBUG) && isFunction(console.dirxml)) {
            this.group(() => {
                if (isString(data) && data.startsWith('<')) {
                    try {
                        //maybe this string is an html element?
                        data = new DOMParser().parseFromString(data, "text/html");
                    } catch (e) { }
                }
                console.dirxml(data);
            }, groupLabel, groupCollapsed);
        }
    }
    /** render messages inside a group, and closes the group when done. if a label is not provided - a group will not be rendered */
    public group(renderContent: () => void, label?: string, collapsed?: boolean) {
        let hadGroup = false;
        if (this.enabledFor(LoggerLevel.DEBUG) && isFunction(console.group) && !isNullOrEmptyString(label)) {
            if (collapsed) {
                console.groupCollapsed(`${this.contextPrefix()} ${label}`);
            } else {
                console.group(`${this.contextPrefix()} ${label}`);
            }
            hadGroup = true;
        }

        if (hadGroup) this.time(label);
        //we must run render content even if no groups - since this might hold other code the caller needs to run
        renderContent();
        if (hadGroup) {
            this.timeEnd(label);
            console.groupEnd();
        }
    }

    public groupSync<ReturnType>(label: string, renderContent: (log: (message: logMessageValue) => void) => ReturnType, options?: {
        expand?: boolean;
        /** do not write to log */
        supress?: boolean;
    }) {
        if (isNullOrEmptyString(label)) label = "SyncGroup";
        let { logMessages, start, logMessage } = this.$startGroup();

        let result: ReturnType;
        try {
            result = renderContent(logMessage);
        } catch (e) {
            logMessage(`Unhandled exception: ${e}`);
            throw this.$finishGroup(label, e, start, logMessages, options);
        }

        return this.$finishGroup(label, result, start, logMessages, options);
    }
    public async groupAsync<ReturnType>(label: string, renderContent: (log: (message: logMessageValue) => void) => Promise<ReturnType>, options?: {
        expand?: boolean;
        /** do not write to log */
        supress?: boolean;
    }) {
        if (isNullOrEmptyString(label)) label = "AsyncGroup";
        let { logMessages, start, logMessage } = this.$startGroup();

        let result: ReturnType;
        try {
            result = await renderContent(logMessage);
        } catch (e) {
            logMessage(`Unhandled exception: ${e}`);
            throw this.$finishGroup(label, e, start, logMessages, options);
        }

        return this.$finishGroup(label, result, start, logMessages, options);
    }

    private $startGroup() {
        let logMessages: logMessage[] = [];

        let start = new Date();
        let lastMessage = start;

        let logMessage = (message: logMessageValue) => {
            logMessages.push({
                message: isString(message) || isNullOrUndefined(message)
                    ? message
                    : jsonClone(message), seconds: getSecondsElapsed(lastMessage)
            });
            lastMessage = new Date();
        };

        return { logMessage, logMessages, start };
    }
    private $finishGroup<ReturnType>(label: string, result: ReturnType, start: Date, logMessages: logMessage[], options?: {
        expand?: boolean;
        /** do not write to log */
        supress?: boolean;
    }) {
        if (options && options.supress) return result;
        label = `${label} (${getSecondsElapsed(start)}s)`;

        if (this.enabledFor(LoggerLevel.DEBUG) && isFunction(console.group) && !isNullOrEmptyString(label)) {
            if (options && options.expand) {
                console.group(`${this.contextPrefix()} ${label}`);
            } else {
                console.groupCollapsed(`${this.contextPrefix()} ${label}`);
            }
        }
        else return result;

        //drop directly, without a prefix, in the group
        logMessages.forEach(m => {
            if (isString(m.message))
                console.debug(`(${m.seconds}s) ${m.message}`);
            else {
                console.debug(`(${m.seconds}s) ${m.message.label}`);
                console.dir(m.message.value);
            }
        });
        console.groupEnd();
        return result;
    }

    private logWithLevel(level: LoggerLevel, message: any) {
        try {
            if (this.enabledFor(level)) {
                var isSimpleObject = isString(message) || isNumber(message);
                var logMessage = this.format(isSimpleObject ? "%s" : "%o");
                switch (level) {
                    case LoggerLevel.DEBUG:
                        console.debug(logMessage, message);
                        break;
                    case LoggerLevel.ERROR:
                        console.error(logMessage, message);
                        break;
                    case LoggerLevel.WARN:
                        console.warn(logMessage, message);
                        break;
                    case LoggerLevel.INFO:
                        console.info(logMessage, message);
                        break;
                    case LoggerLevel.TRACE:
                        console.trace(logMessage, message);
                        break;
                    default:
                        console.log(logMessage, message);
                }
            }
        } catch (ex) {
            //empty
        }
    }
}