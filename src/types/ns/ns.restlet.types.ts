import { nsReadOnlyFieldTypes, tnsFieldTypes } from "./ns.common.types";

export type tnsrFieldValueTypes = string | boolean | number | Date | string[] | number[];

export type tnsrFieldInfo = {
    id: string;
    label: string;
    type: tnsFieldTypes;
    isMandatory: boolean;
    //isDisabled: boolean; does not exist on server side
    //isReadOnly: boolean; does not exist on server side
    //isDisplay: boolean; -  not useful, this only says if the field is displayed in the specific form, for specific values (like, dynamic column level permissions);. this can change based on the default form - not to be used to to filter editable/available fields. only available for records with Dynamic Mode
    isVisible: boolean;
    defaultValue?: tnsrFieldValueTypes;
    options?: Array<{ value: string | number; text: string }>;
}

const ghostFieldPrefixes = ['_', 'nsapi'];
const systemReadOnlyFields = [
    //body fields
    'id', 'internalid', 'createddate', 'lastmodifieddate',
    'owner', 'status', 'total', 'subtotal', 'tranid',
    'wfinstances', 'entryformquerystring',
    //sublist fields
    'line', 'linenumber', 'quantityonhand', 'quantityavailable', 'taxrate'
];

export function tnsrFieldEditableFilter(field: tnsrFieldInfo) {
    return field.isVisible !== false && !systemReadOnlyFields.includes(field.id.toLowerCase())
        && !nsReadOnlyFieldTypes.includes(field.type as any)
        //also remove system / ghost fields by prefix
        && !ghostFieldPrefixes.some(pre => field.id.startsWith(pre));
}