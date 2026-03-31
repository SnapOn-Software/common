export const nsReadOnlyFieldTypesForSublist = ["inlinehtml",
    //found on customer
    "label", "help",
] as const;
export const nsReadOnlyFieldTypes = [...nsReadOnlyFieldTypesForSublist, "address"] as const;
export const nsFieldTypes = ["date", "datetime", "textarea", "richtext", "checkbox", "currency", "float", "integer",
    "text", "percent", "email", "phone", "url", "image",
    "select", "multiselect",
    //1,000,000 characters
    "clobtext",
    //1,000,000 characters
    "longtext",
    "datetimetz", "password",
    //eg: MM/YY or MM/YYYY
    "mmyydate",
    //eg: '1:30 pm'
    "timeofday", "time",
    //positive number, greater than 0
    "posinteger", "poscurrency",

    //found on customer
    "radio",
    //found on account
    "bank_id",

    //found on sales order
    "currency2", "rate", "ccnumber", "ccexpdate",
    //{name:'color',value:'red'}[]
    "namevaluelist",
    //semicolon separated emails
    "emails",
    ...nsReadOnlyFieldTypes] as const;
export type tnsFieldTypes = typeof nsFieldTypes[number];
export function isnsFieldTypes(value: string): value is tnsFieldTypes {
    return nsFieldTypes.includes(value as any);
}
export const nsHtmlFields: tnsFieldTypes[] = ["richtext", "inlinehtml"];
export function isnsHtmlField(type: tnsFieldTypes) {
    return nsHtmlFields.includes(type);
}
export const nsMultiLineFields: tnsFieldTypes[] = [...nsHtmlFields, "textarea", "clobtext", "longtext"];
export function isnsMultiLineField(type: tnsFieldTypes) {
    return nsMultiLineFields.includes(type);
}
export const nsChoiceFields: tnsFieldTypes[] = ["select", "multiselect", "radio"];
export function isnsChoiceField(type: tnsFieldTypes) {
    return nsChoiceFields.includes(type);
}

export const nsDateTimeFields: tnsFieldTypes[] = ["datetime", "datetimetz", "time", "timeofday"];
export const nsDateFields: tnsFieldTypes[] = [...nsDateTimeFields, "date", "mmyydate"];
export function isnsDateTimeField(type: tnsFieldTypes) {
    return nsDateTimeFields.includes(type);
}
export function isnsDateField(type: tnsFieldTypes) {
    return nsDateFields.includes(type);
}
