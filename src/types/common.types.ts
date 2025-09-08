//Drop common, non product specific, types

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
