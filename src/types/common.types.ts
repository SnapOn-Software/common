//Drop common, non product specific, types

export type releasetypes = "dev" | "fastring" | "production" | "npm";

export interface IDictionary<valueType> { [key: string]: valueType; }

export type IdTextPair = { id: string; text: string; };
export type KeyValuePair<T> = { key: string; value: T; };

/** display info for enums or custom types for modern UI dropdowns */
export interface ITypesDisplayInfo<ValueType> {
    value: ValueType;
    title: string;
    description?: string;
    fabricIconName?: string;
}

export type DateOrNull = Date | null;

/** @deprecated prefer using iFileData2 to avoid exessive memory usage converting large files from base64 to array buffer */
export interface iFileData {
    filename: string;
    base64: string;
}
interface iFileData64 {
    filename: string;
    base64: string;
    buffer?: never;
}
interface iFileDataBuffer {
    filename: string;
    buffer: ArrayBuffer;
    base64?: never;
}
/** use if you support either base64 or ArrayBuffer */
export type tFileDataV2 = iFileData64 | iFileDataBuffer;

/** allow using Omit on complex join types */
export type DeepOmit<T, K extends keyof T> = T extends any ? Omit<T, K> : never;

/** return a success flag with either error message or the value */
export type apiResultType<T> = { success: false, error: string } | { success: true, value: T };

export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
