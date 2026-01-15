import { chunkArray } from "../../helpers/collections.base";
import { hasOwnProperty } from "../../helpers/objects";
import { promiseNParallel } from "../../helpers/promises";
import { isBoolean, isDate, isNotEmptyArray, isNotEmptyString, isNullOrEmptyArray, isNullOrEmptyString, isNullOrUndefined, isNumber, isObject, isString } from "../../helpers/typecheckers";
import { encodeURIComponentEX } from "../../helpers/url";
import { IDictionary } from "../../types/common.types";
import { jsonTypes } from "../../types/rest.types";
import { DateTimeFieldFormatType, IAttachmentInfo, IFieldCurrencyInfo, IFieldDateTimeInfo, IFieldInfoEX, IFieldNumberInfo, TaxonomyValueType } from "../../types/sharepoint.types";
import { IRestItem } from "../../types/sharepoint.utils.types";
import { LocaleKnownScript } from "../../utils/knownscript";
import { ConsoleLogger } from "../consolelogger";
import { GetJson, GetJsonSync, shortLocalCache } from "../rest";
import { DecodeFieldValuesAsTextKey, GetFieldNameFromRawValues, GetSiteUrl, __getSPRestErrorData, getFieldNameForUpdate, hasGlobalContext } from "./common";
import { GetList, GetListFields, GetListFieldsAsHash, GetListRestUrl } from "./list";
import { SPVersionToVersionId } from "./listutils/common";
import { GetUser, GetUserSync } from "./user";

const logger = ConsoleLogger.get("utils/sharepoint.rest/item");

/** can only select FileSizeDisplay in REST api */
export const FileSizeColumnInternalNames = ["FileSizeDisplay", "File_x0020_Size"];

function _getListItemSelectExpandFields(fields: string[], listFields: IFieldInfoEX[]) {
    var $selectFields = [];
    var $expandFields = [];

    fields.forEach((fieldName) => {
        if (FileSizeColumnInternalNames.includes(fieldName)) {
            $selectFields.push(FileSizeColumnInternalNames[0]);//for some reason, can't select File_x0020_Size
        }
        else {
            let field = listFields.filter((listField) => { return listField.InternalName === fieldName; })[0];
            if (!isNullOrUndefined(field)) {
                if (field.TypeAsString === "User" || field.TypeAsString === "UserMulti") {
                    $selectFields.push(`${field.InternalName}/ID`);
                    $selectFields.push(`${field.InternalName}/Name`);
                    $selectFields.push(`${field.InternalName}/UserName`);
                    $selectFields.push(`${field.InternalName}/EMail`);
                    $selectFields.push(`${field.InternalName}/Title`);
                    $expandFields.push(field.InternalName);
                } else {
                    $selectFields.push(field.InternalName);
                }
            }
        }
    });

    return {
        expandFields: $expandFields,
        selectFields: $selectFields
    };
}

function _parseValueFromRawValue(rawValue: any, asDisplayValue = false) {
    if (!isNullOrUndefined(rawValue)) {
        if (rawValue["ID"] && rawValue["Title"] && rawValue["Name"]) { //expanded user field from rest request
            return !asDisplayValue ? rawValue["ID"] : rawValue["Title"];
        } else if (Array.isArray(rawValue)) {
            return rawValue.map((value) => {
                if (value["ID"] && value["Title"] && value["Name"]) { //expanded user field from rest request
                    return !asDisplayValue ? value["ID"] : value["Title"];
                }
                return value;
            }).filter((value) => {
                return value !== null;
            });
        } else {
            return rawValue;
        }
    }
}

async function _getListItemRawFieldValues(siteUrl: string, listIdOrTitle: string, itemId: number | string, fields: string[], options?: { refreshCache?: boolean; }): Promise<{ [fieldName: string]: any; }> {
    siteUrl = GetSiteUrl(siteUrl);

    options = options || {};

    let listFields = await GetListFields(siteUrl, listIdOrTitle);
    var { selectFields, expandFields } = _getListItemSelectExpandFields(fields, listFields);

    var $select = `$select=` + encodeURIComponent(selectFields.length ? `${selectFields.join(',')}` : fields.join(','));
    var $expand = expandFields.length ? `$expand=${encodeURIComponent(expandFields.join(','))}` : "";

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})?${$select}&${$expand}`;
    let result = await GetJson<{ d: { [field: string]: any; }; }>(url, null, {
        allowCache: options.refreshCache !== true,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });

    var values = {};

    if (result && typeof (result.d) !== "undefined") {
        var rawValues = result.d;
        fields.forEach((fieldName) => {
            let rawValue = (FileSizeColumnInternalNames.includes(fieldName)) ? rawValues[FileSizeColumnInternalNames[0]] : rawValues[fieldName];
            if (!isNullOrUndefined(rawValue)) {
                values[fieldName] = rawValue;
            }
        });
    }

    return values;
}

export function GetListItemFieldDisplayValueSync(siteUrl: string, listIdOrTitle: string, itemId: number | string, field: string): string {
    return GetListItemFieldDisplayValuesSync(siteUrl, listIdOrTitle, itemId, [field])[field];
}
export function GetListItemFieldDisplayValuesSync(siteUrl: string, listIdOrTitle: string, itemId: number | string, fields: string[]): IDictionary<string> {
    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/FieldValuesAsText?$select=${fields.join(',')}`;
    let result = GetJsonSync<IDictionary<string>>(url, null, {
        allowCache: true, jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });
    return result.success ? result.result : {};
}

export async function GetListItemFieldDisplayValue(siteUrl: string, listIdOrTitle: string, itemId: number | string, field: string, options?: { refreshCache?: boolean; }): Promise<string> {
    var values = await GetListItemFieldDisplayValues(siteUrl, listIdOrTitle, itemId, [field], options);
    return values && values[field];
}

export async function GetListItemFieldDisplayValues(siteUrl: string, listIdOrTitle: string, itemId: number | string, fields: string[], options?: { refreshCache?: boolean; }): Promise<{ [fieldName: string]: string; }> {
    var rawValues = await _getListItemRawFieldValues(siteUrl, listIdOrTitle, itemId, fields, options);

    var values = {};
    Object.keys(rawValues).forEach(key => {
        var fieldValue = _parseValueFromRawValue(rawValues[key], true);
        if (!isNullOrUndefined(fieldValue)) {
            values[key] = fieldValue;
        }
    });

    return values;
}

export async function GetListItemFieldValue(siteUrl: string, listIdOrTitle: string, itemId: number | string, field: string, options?: { refreshCache?: boolean; }): Promise<any> {
    var values = await GetListItemFieldValues(siteUrl, listIdOrTitle, itemId, [field], options);
    return values && values[field];
}

export async function GetListItemFieldValues(siteUrl: string, listIdOrTitle: string, itemId: number | string, fields: string[], options?: { refreshCache?: boolean; }): Promise<{ [fieldName: string]: any; }> {
    var rawValues = await _getListItemRawFieldValues(siteUrl, listIdOrTitle, itemId, fields, options);

    var values = {};
    Object.keys(rawValues).forEach(key => {
        var fieldValue = _parseValueFromRawValue(rawValues[key]);
        if (!isNullOrUndefined(fieldValue)) {
            values[key] = fieldValue;
        }
    });

    return values;
}

/** version #.# or version ID as number */
export async function GetListItem(siteUrl: string, listIdOrTitle: string, itemId: number | string, version?: string | number, options?: { refreshCache?: boolean; }): Promise<IRestItem> {
    if (!options)
        options = {};
    siteUrl = GetSiteUrl(siteUrl);

    let versionPart = "";
    if (isNumber(version) && version > 0 || isNotEmptyString(version)) {
        versionPart = `/versions(${SPVersionToVersionId(version)})`;
    }

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})${versionPart}`;
    let result = await GetJson<IRestItem>(url, null, {
        allowCache: options.refreshCache !== true,
        jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });

    if (isNotEmptyString(versionPart))//versions come back as values as text, need to clean them up for consistency
    {
        Object.keys(result).forEach(internalNameAsText => {
            let internalName = DecodeFieldValuesAsTextKey(internalNameAsText);
            let value = result[internalNameAsText];
            if (!isNullOrUndefined(value)) {
                if (isString(value.StringValue))
                    value = value.StringValue;//ContentTypeId
                else if (isNumber(value.LookupId)) {
                    internalName = `${internalName}Id`;
                    value = value.LookupId;
                }
                else if (Array.isArray(value)) {
                    if (isNumber(value[0].LookupId)) {
                        internalName = `${internalName}Id`;
                        value = value.map(v => v.LookupId);
                    }
                }
            }
            result[internalName] = value;
        });
    }

    return result;
}


/** Returns version array, newest version first. Can get moderator comments, cannot get file check in comments */
export async function GetListItemFieldValuesHistory(siteUrl: string, listIdOrTitle: string, itemId: number | string, fields: string[], options?: { refreshCache?: boolean; }) {
    siteUrl = GetSiteUrl(siteUrl);

    options = options || {};
    var $select = isNotEmptyArray(fields) ? `$select=` + encodeURIComponent(`${fields.join(',')}`) : "";

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/versions?${$select}`;
    let result = await GetJson<{ value: IRestItem[]; }>(url, null, {
        allowCache: options.refreshCache !== true,
        jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });

    return result && result.value || [];
}

export async function DeleteListItem(siteUrl: string, listIdOrTitle: string, itemId: number | string): Promise<{ deleted: boolean; errorMessage?: string; }> {
    siteUrl = GetSiteUrl(siteUrl);

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})`;

    let result: { deleted: boolean; errorMessage?: string; } = { deleted: true };
    try {
        await GetJson<string>(url, null, { method: "POST", spWebUrl: siteUrl, xHttpMethod: "DELETE" });
        //empty string means deleted
    } catch (e) {
        result.deleted = false;
        result.errorMessage = __getSPRestErrorData(e).message;
    }

    return result;
}

export async function RecycleListItem(siteUrl: string, listIdOrTitle: string, itemId: number | string): Promise<{ recycled: boolean; errorMessage?: string; }> {
    siteUrl = GetSiteUrl(siteUrl);

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/recycle()`;

    let result: { recycled: boolean; errorMessage?: string; } = { recycled: true };
    try {
        await GetJson<{ d: { Recycle: string; }; }>(url, null, { method: "POST", spWebUrl: siteUrl });
        //value.d.Recycle will hold guide reference id
    } catch (e) {
        result.recycled = false;
        result.errorMessage = __getSPRestErrorData(e).message;
    }

    return result;
}

export async function GetListItemAttachments(siteUrl: string, listIdOrTitle: string, itemId: number): Promise<IAttachmentInfo[]> {
    siteUrl = GetSiteUrl(siteUrl);

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/AttachmentFiles`;

    try {
        let result = await GetJson<{ d: { results: IAttachmentInfo[]; }; }>(url, null, {
            includeDigestInGet: true,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        let attachmentFiles = result.d && result.d.results ? result.d.results : [];
        return attachmentFiles;
    } catch (e) {
    }
    return [];
}

export async function GetListItemsAttachments(siteUrl: string, listIdOrTitle: string, itemIds: number[]): Promise<{ Id: number, AttachmentFiles: IAttachmentInfo[] }[]> {
    siteUrl = GetSiteUrl(siteUrl);
    let chunks = chunkArray(itemIds, 30);
    let select = `$select=ID,AttachmentFiles`;
    let expand = `$expand=AttachmentFiles`;
    let baseUrl = GetListRestUrl(siteUrl, listIdOrTitle) + `/items`;
    let promises = chunks.map((chunk) => {
        return () => {
            let filter = `$filter=${chunk.map(i => `ID eq ${i}`).join(" or ")}`;
            let url = `${baseUrl}?${select}&${filter}&${expand}`
            return GetJson<{ value: { Id: number, AttachmentFiles: IAttachmentInfo[] } }>(url, null, {
                includeDigestInGet: true, jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
            });
        };
    });
    try {
        let result = await promiseNParallel(promises, 5);
        return result && result.length > 0 ? result.map(v => v.value) : [];
    } catch {

    }
    return [];
}

export async function AddAttachment(siteUrl: string, listIdOrTitle: string, itemId: number, filename: string, buffer: ArrayBuffer) {
    siteUrl = GetSiteUrl(siteUrl);

    //Issue 999
    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponentEX(filename, { singleQuoteMultiplier: 2 })}')`;

    try {
        let result = await GetJson<{ d: IAttachmentInfo; }>(url, buffer, {
            includeDigestInPost: true, method: "POST",
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        let attachmentFile = result && result.d;
        return attachmentFile;
    } catch (e) {
    }
    return null;
}

export async function DeleteAttachment(siteUrl: string, listIdOrTitle: string, itemId: number, filename: string) {
    siteUrl = GetSiteUrl(siteUrl);

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/AttachmentFiles('${encodeURIComponentEX(filename, { singleQuoteMultiplier: 2 })}')`;

    let result: { deleted: boolean; errorMessage?: string; } = { deleted: true };
    try {
        await GetJson<{ d: IAttachmentInfo; }>(url, null, { spWebUrl: siteUrl, method: "POST", xHttpMethod: "DELETE" });
    } catch (e) {
        result.deleted = false;
        result.errorMessage = __getSPRestErrorData(e).message;
    }
    return result;
}

//** Update value of taxonomy multi-value field. See issue 7585 for more info */
export async function UpdateMultiTaxonomyValue(siteUrl: string, listIdOrTitle: string, itemId: number,
    updates: IDictionary<TaxonomyValueType[]>) {

    let fields = updates && Object.keys(updates) || [];

    if (isNullOrEmptyArray(fields)) return [];

    siteUrl = GetSiteUrl(siteUrl);

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/ValidateUpdateListItem()`;

    try {
        let result = await GetJson<{
            d: {
                ValidateUpdateListItem: {
                    results: {
                        ErrorCode: number;
                        ErrorMEssage?: string;
                        FieldName: string;
                        FieldValue: string;
                        HasException: boolean;
                        ItemId: number;
                    }[];
                };
            };
        }>(url, JSON.stringify({
            bNewDocumentUpdate: false,
            checkInComment: null,
            formValues: fields.map(field => ({
                ErrorMessage: null,
                FieldName: field,
                FieldValue: updates[field].map(v => `${v.Label}|${v.TermGuid};`).join(''),
                HasException: false
            }))
        }), {
            includeDigestInPost: true, method: "POST",
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        return result && result.d && result.d.ValidateUpdateListItem.results.map(v => ({ field: v.FieldName, error: v.ErrorMEssage })) || [];
    } catch (e) {
        logger.error(`Error updating UpdateMultiTaxonomyValue ${e}`);
    }
    return fields.map(f => ({ field: f, error: 'Unspecified update error' }));
}

export async function AddItem(siteUrl: string, listIdOrTitle: string, fieldValues: IDictionary<any>) {
    //we must force creating even if no values, otherwise the item won't be created at all.
    return UpdateItem(siteUrl, listIdOrTitle, null, fieldValues, { updateIfNoFields: true });
}
export interface UpdateItemType {
    updateProps: {
        success: boolean;
        itemId: number;
        errorMessage?: undefined;
    } | {
        success: boolean;
        errorMessage: string;
        itemId: number;
    }
}
export async function UpdateItem(siteUrl: string, listIdOrTitle: string, itemId: number, fieldValues: IDictionary<any>, options?: { updateIfNoFields?: boolean; }) {
    var success = false;
    var error: string = null;
    try {
        siteUrl = GetSiteUrl(siteUrl);

        let isNewItem = itemId > 0 ? false : true;
        let listInfo = await GetList(siteUrl, listIdOrTitle);
        let fields = await GetListFieldsAsHash(siteUrl, listIdOrTitle);
        let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items${isNewItem ? '' : `(${itemId})`}`;

        var itemUpdateInfo: { [key: string]: any; } = {
            '__metadata': { 'type': `SP.Data.${listInfo.EntityTypeName}Item` }
        };
        let hasUpdates = false;
        Object.keys(fieldValues).forEach(updateField => {
            let listField = fields[updateField];
            if (listField)//make sure this field exists on the list
            {
                //todo: we might want to get the value first, make sure it is formatted correctly for the field type.
                itemUpdateInfo[getFieldNameForUpdate(listField)] = fieldValues[updateField];
                hasUpdates = true;
            }
        });

        if (!hasUpdates) {
            let forceUpdate = options && options.updateIfNoFields;
            if (!forceUpdate)
                return { success: true, itemId: itemId };
        }

        var xHttpMethod: "MERGE" = isNewItem ? null : "MERGE";

        try {
            let result = await GetJson<{ d: { Id: number; }; }>(url, JSON.stringify(itemUpdateInfo), {
                method: "POST", xHttpMethod: xHttpMethod,
                spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
            });
            if (result)
                if (isNewItem)
                    itemId = result.d.Id;// update item will not return data. only new item will.
            success = true;
        } catch (e) {
            error = __getSPRestErrorData(e).message;
        }
    } catch (e) {
        logger.group(() => logger.error(e), 'Update item failed');
    }
    return { success: success, errorMessage: error, itemId: itemId };
}
/** Get a sharepoint field value as text, from a rest item */
export function GetSPRestItemValueAsText(item: IRestItem, field: IFieldInfoEX): string {

    var otherName = field.InternalName.replace(/_/g, "_x005f_");//sometimes _ gets replaced with _x005f_
    if (!isNullOrUndefined(item.FieldValuesAsText)) {
        if (hasOwnProperty(item.FieldValuesAsText, field.InternalName))
            return item.FieldValuesAsText[field.InternalName];
        if (hasOwnProperty(item.FieldValuesAsText, otherName))
            return item.FieldValuesAsText[otherName];
    }

    return GetSPFieldValueAsText(item[GetFieldNameFromRawValues(field)], field).join(', ');
}
/** Get a sharepoint field value as text array, from a rest item */
export function GetSPRestItemValueAsTextArray(item: IRestItem, field: IFieldInfoEX): string[] {
    //get value as text first
    let valueAsText = null;
    var otherName = field.InternalName.replace(/_/g, "_x005f_");//sometimes _ gets replaced with _x005f_
    if (!isNullOrUndefined(item.FieldValuesAsText)) {
        if (hasOwnProperty(item.FieldValuesAsText, field.InternalName))
            valueAsText = item.FieldValuesAsText[field.InternalName];
        if (hasOwnProperty(item.FieldValuesAsText, otherName))
            valueAsText = item.FieldValuesAsText[otherName];
    }
    if (!isNullOrEmptyString(valueAsText) && valueAsText.indexOf(',') < 0)//not empty, and we do not suspect a multi-value field
        return [valueAsText];

    return GetSPFieldValueAsText(item[GetFieldNameFromRawValues(field)], field);
}
/** prefer to use GetSPRestValueAsText instead */
export function GetSPFieldValueAsText(value: any, field: IFieldInfoEX): string[] {
    let locales = LocaleKnownScript.loadSync();
    let culture = locales.GetCurrentCulture();

    let rawValues: (string | number | boolean | Date | TaxonomyValueType | TaxonomyValueType[] | { Id: string | number; Title: string; })[] =
        isNullOrEmptyString(value)
            ? []
            : Array.isArray(value)
                ? value//value.raw is an array
                : [value];//value.raw is not an array - wrap it.

    let isLookup = field.TypeAsString === "Lookup" || field.TypeAsString === "LookupMulti";
    let isUser = field.TypeAsString === "User" || field.TypeAsString === "UserMulti";
    let isCounter = field.TypeAsString === "Counter" || field.TypeAsString === "Integer";
    let isTaxonomy = field.TypeAsString === "TaxonomyFieldType" || field.TypeAsString === "TaxonomyFieldTypeMulti";
    if (field.TypeAsString === "DateTime") {
        //Issue 8190 - date field might come as string
        rawValues = rawValues.map(v => isDate(v) ? v : new Date(v as string));
    }
    else if (isUser || isLookup) {
        rawValues = rawValues.map(v => isNumber(v) ? v : !isNullOrEmptyString(v && (v as any).Title) ? (v as any).Title : isNumber(v && (v as any).Id) ? (v as any).Id : null);
    }

    let textResults: string[] = [];
    if (isNotEmptyArray(rawValues)) {
        rawValues.forEach(raw => {
            if (isNullOrEmptyString(raw)) {/** skip */ }
            else if (isNumber(raw))
                if (isUser && hasGlobalContext()) {
                    //todo - try not sync...
                    try {
                        let userInfo = GetUserSync(_spPageContextInfo.siteServerRelativeUrl, raw);
                        textResults.push(userInfo.Title);
                    } catch (e) {
                        textResults.push(`${raw}`);
                    }
                }
                else if (isLookup) {
                    //todo - not supported
                    try {
                        textResults.push(`Lookup #${raw}`);
                    }
                    catch (e) {
                        textResults.push(`${raw}`);
                    }
                } else if (isCounter) {
                    textResults.push(raw.toString());
                } else {
                    textResults.push(locales.NumberToString(raw, culture, {
                        isCurrency: isNumber((field as IFieldCurrencyInfo).CurrencyLocaleId),
                        isPercent: (field as IFieldNumberInfo).ShowAsPercentage
                    }));
                }
            else if (isTaxonomy) {
                if (isNotEmptyArray(raw)) {
                    textResults.push(raw.map(t => `${t.Label}|${t.TermGuid}`).join(';'));
                } else if (isObject(raw) && raw !== null && 'Label' in raw) {
                    textResults.push(raw.Label || '');
                }
            }
            else if (isString(raw))
                textResults.push(raw);
            else if (isBoolean(raw)) {
                textResults.push(raw ? "Yes" : "No");
            }
            else if (isDate(raw)) {
                textResults.push(locales.DateToString(raw, culture, {
                    includeDate: true,
                    includeTime: (field as IFieldDateTimeInfo).DisplayFormat === DateTimeFieldFormatType.DateTime
                }));
            }
        });
    }
    return textResults;
}

/** set an existing item system info: author, editor, created and modified dates */
export async function SetItemCreatedModifiedInfo(siteUrl: string, listIdOrTitle: string, itemId: number,
    updates: { Created?: string | Date; Modified?: string | Date; AuthorId?: number; EditorId?: number; }) {

    let updateValues: IDictionary<string> = {};

    let fields = updates && Object.keys(updates) || [];
    if (!isNullOrEmptyString(updates.Created))//date must be yyyy-MM-dd hh:mm:ss
        updateValues.Created = (isString(updates.Created) ? new Date(updates.Created) : updates.Created).toISOString().replace('T', ' ').split('.')[0];
    if (!isNullOrEmptyString(updates.Modified))
        updateValues.Modified = (isString(updates.Modified) ? new Date(updates.Modified) : updates.Modified).toISOString().replace('T', ' ').split('.')[0];
    if (updates.AuthorId > 0) {
        let asUser = await GetUser(siteUrl, updates.AuthorId);
        updateValues.AuthorId = `[{'Key':'${asUser.UserPrincipalName}'}]`;//[{'Key':'i:0#.f|membership|user@Tenant.onmicrosoft.com'}]
    }
    if (updates.EditorId > 0) {
        let asUser = await GetUser(siteUrl, updates.EditorId);
        updateValues.AuthorId = `[{'Key':'${asUser.UserPrincipalName}'}]`;//[{'Key':'i:0#.f|membership|user@Tenant.onmicrosoft.com'}]
    }

    if (isNullOrEmptyArray(fields)) return [];

    siteUrl = GetSiteUrl(siteUrl);

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/ValidateUpdateListItem()`;

    try {
        let result = await GetJson<{
            d: {
                ValidateUpdateListItem: {
                    results: {
                        ErrorCode: number;
                        ErrorMEssage?: string;
                        FieldName: string;
                        FieldValue: string;
                        HasException: boolean;
                        ItemId: number;
                    }[];
                };
            };
        }>(url, JSON.stringify({
            formValues: fields.map(field => ({
                FieldName: field,
                FieldValue: updateValues[field]
            }))
        }), {
            method: "POST",
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });
        return result && result.d && result.d.ValidateUpdateListItem.results.map(v => ({ field: v.FieldName, error: v.ErrorMEssage })) || [];
    } catch (e) {
        logger.error(`Error updating values ${e}`);
    }
    return fields.map(f => ({ field: f, error: 'Unspecified update error' }));
}

export async function ListItemHasUniquePermissions(siteUrl: string, listIdOrTitle: string, itemId: number): Promise<boolean> {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/items(${itemId})/?$select=hasuniqueroleassignments`;
    let has = await GetJson<{ HasUniqueRoleAssignments: boolean }>(url, undefined, {
        allowCache: false, jsonMetadata: jsonTypes.nometadata,
        spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
    });
    return has.HasUniqueRoleAssignments === true;
}
export async function RestoreListItemPermissionInheritance(siteUrl: string, listIdOrTitle: string, itemId: number): Promise<void> {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/items(${itemId})/ResetRoleInheritance`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function BreakListItemPermissionInheritance(siteUrl: string, listIdOrTitle: string, itemId: number, clear = true): Promise<void> {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/items(${itemId})/breakroleinheritance(copyRoleAssignments=${clear ? 'false' : 'true'}, clearSubscopes=true)`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function AssignListItemPermission(siteUrl: string, listIdOrTitle: string, itemId: number, principalId: number, roleId: number) {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/items(${itemId})/roleassignments/addroleassignment(principalid=${principalId},roleDefId=${roleId})`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function RemoveListItemPermission(siteUrl: string, listIdOrTitle: string, itemId: number, principalId: number, roleId: number) {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/items(${itemId})/roleassignments/removeroleassignment(principalid=${principalId},roleDefId=${roleId})`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}

export async function GetItemEffectiveBasePermissions(siteUrlOrId: string, listIdOrTitle: string, itemId: number) {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    let response = await GetJson<{
        d: {
            EffectiveBasePermissions: {
                High: number; Low: number;
            };
        };
    }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/items(${itemId})/EffectiveBasePermissions`, null,
        {
            ...shortLocalCache,
            spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
        });

    return response.d.EffectiveBasePermissions;
}
