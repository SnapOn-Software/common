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

export interface iFileData {
    filename: string;
    base64: string;
}

/** allow using Omit on complex join types */
export type DeepOmit<T, K extends keyof T> = T extends any ? Omit<T, K> : never;

/** return a success flag with either error message or the value */
export type apiResultType<T> = { success: false, error: string } | { success: true, value: T };
