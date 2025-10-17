interface IMomentJSObj {
    toDate: () => Date;
    isValid: () => boolean;
    utc(): {
        format(): string;
    },
    format(f?:string): string;
}


export type typeMomentJS = (inp?: string, format?: string, strict?: boolean) => IMomentJSObj;
export interface typeMonentJSTimeZone {
    (inp?: string, format?: string, strict?: boolean): IMomentJSObj;
    (inp?: string, format?: string, tz?: string): IMomentJSObj;
    names(): string[];
    utc(): IMomentJSObj;
}
declare global {
    var momentJS: typeMomentJS;
    var monentJSTimeZone: typeMonentJSTimeZone;
}