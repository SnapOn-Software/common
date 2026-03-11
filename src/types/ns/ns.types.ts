export interface insSuiteTalkRestErrorData {
    "o:errorDetails": {
        detail: string;
        "o:errorCode": string;
        "o:errorQueryParam": string;
    }[];
    status: number;
    title: string;
}

export type tnsSoapRequest =
    "get" |
    "getAll" |
    "upsert" |
    "update" |
    "upsertList" |
    "search" |
    "add" |
    "delete";

export interface insBaseResponse {
    Header: {
        documentInfo: {
            nsId: string
        }
    },
    Body: {}
}

export interface insSoapResponseError {
    Body:
    {
        Fault:
        {
            faultcode: string,
            faultstring: string,
            detail:
            {
                invalidCredentialsFault:
                {
                    $: {
                        platformFaults: string
                    },
                    code: string,
                    message: string
                },
                hostname: {
                    _: string
                }
            }
        }
    }
}

export type insSuiteTalkResponseLink = {
    rel: "canonical" | "alternate" | "describes" | "self";
    href: string;
    mediaType?: "application/schema+json" | "application/swagger+json" | "application/json"
};

export interface insSuiteTalkRecordResponseBase {
    links: insSuiteTalkResponseLink[];
}
/** pass-through type of items, for getFields if a field is of type object it would use this since items will not be an array */
export interface insSuiteTalkRecordsResponseBase<T> extends insSuiteTalkRecordResponseBase {
    count: number;
    hasMore: boolean;
    items: T;
    offset: number;
    totalResults: number;
}
/** standard collection response where items is an array of type T */
export interface insSuiteTalkRecordsResponseCollection<T> extends insSuiteTalkRecordsResponseBase<(T & insSuiteTalkRecordResponseBase)[]> {
}

export interface insRefType extends insSuiteTalkRecordResponseBase {
    id: string,//"5",
    refName: string,//"Stubbe's Redimix Inc."
}
export const insEmployeeFields = 'firstName,lastName,email,entityId,initials,subsidiary' as const;
export interface insEmployee extends insSuiteTalkRecordResponseBase {
    firstName: string;
    lastName: string;
    /** full name */
    entityId: string;
    email: string;
    initials: string;
    subsidiary: insRefType;
}

export interface insObject extends insSuiteTalkRecordResponseBase {
    name: string;
}

interface insFieldBase {
    title: string;
    description?: string;
    readOnly?: boolean;
    nullable?: boolean;
    'x-ns-custom-field'?: boolean;
}
export type tnsField = insFieldBase & {
    type: "string";
    format?: 'date' | 'date-time';
} | insFieldBase & {
    type: "boolean";
} | insFieldBase & {
    type: "number";
    format: 'float' | 'double';
} | insFieldBase & {
    type: "integer";
    format: 'int64';
} | insFieldBase & {
    type: "array";
    items: {
        $ref: string;
        type: 'array';
    }
} | insFieldBase & {
    type: "object",
    properties: {
        id: { title: string; type: "string"; enum?: string[]; };
        refName?: { title: string; type: "string"; };
        externalId?: { title: string; type: "string"; };
        links?: { title: string; type: "array"; readOnly: true; };
    };
};

export type tnsFieldValueTypes = string | boolean | number;