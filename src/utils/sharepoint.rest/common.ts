import { jsonParse } from "../../helpers/json";
import { isNullOrEmptyString, isNullOrUndefined, isString, isValidGuid } from "../../helpers/typecheckers";
import { makeServerRelativeUrl, normalizeUrl } from "../../helpers/url";
import { IDictionary } from "../../types/common.types";
import { IRestError } from "../../types/rest.types";
import { FieldTypeAsString, IFieldInfoEX, IFieldTaxonomyInfo } from "../../types/sharepoint.types";
import { ISPRestError } from "../../types/sharepoint.utils.types";
import { ConsoleLogger } from "../consolelogger";
import { getCacheItem, setCacheItem } from "../localstoragecache";
import { mediumLocalCache } from "../rest";
import { GetWebIdSync, GetWebInfoSync } from "./web";

const logger = ConsoleLogger.get("utils/sharepoint.rest/common");

export const LIST_SELECT = `ListExperienceOptions,EffectiveBasePermissions,Description,Title,EnableAttachments,EnableModeration,BaseTemplate,BaseType,Id,Hidden,IsApplicationList,IsPrivate,IsCatalog,ImageUrl,ItemCount,ParentWebUrl,EntityTypeName,DefaultViewUrl,ParentWeb/Id,ParentWeb/Title`;
export const LIST_EXPAND = `ParentWeb/Id,ParentWeb/Title`;
export const WEB_SELECT = "Title,ServerRelativeUrl,Id,WebTemplate,Description,SiteLogoUrl";
export const CONTENT_TYPES_SELECT = "Name,Description,StringId,Group,Hidden,ReadOnly,NewFormUrl,DisplayFormUrl,EditFormUrl,Sealed,MobileDisplayFormUrl,MobileNewFormUrl,MobileEditFormUrl,NewFormTemplateName,DisplayFormTemplateName,EditFormTemplateName";
export const CONTENT_TYPES_SELECT_WITH_FIELDS = `${CONTENT_TYPES_SELECT},Fields`;

export function hasGlobalContext() {
    //_spPageContextInfo.webServerRelativeUrl can be empty string
    return typeof (_spPageContextInfo) !== "undefined" && isString(_spPageContextInfo.webServerRelativeUrl);
}

export function GetFileSiteUrl(fileUrl: string): string {
    let siteUrl: string;
    let urlParts = fileUrl.split('/');
    if (urlParts[urlParts.length - 1].indexOf('.') > 0)//file name
        urlParts.pop();//file name

    let key = "GetSiteUrl|" + urlParts.join("/").toLowerCase();
    siteUrl = getCacheItem<string>(key);
    if (isNullOrUndefined(siteUrl)) {
        while (!isValidGuid(GetWebIdSync(urlParts.join('/'))))
            urlParts.pop();

        siteUrl = normalizeUrl(urlParts.join('/'));
        setCacheItem(key, siteUrl, mediumLocalCache.localStorageExpiration);//keep for 15 minutes
    }
    //must end with / otherwise root sites will return "" and we will think there is no site url.
    return makeServerRelativeUrl(normalizeUrl(siteUrl, true));
}

/** gets a site URL or null, returns the current web URL or siteUrl as relative URL - end with /
 * If you send a guid - it will look for a site with that ID in the current context site collection
 */
export function GetSiteUrl(siteUrlOrId?: string): string {
    if (!isNullOrUndefined(siteUrlOrId) && isValidGuid(siteUrlOrId)) {
        const webInfo = GetWebInfoSync(null, siteUrlOrId);
        return makeServerRelativeUrl(normalizeUrl(webInfo.ServerRelativeUrl, true));
    }
    return GetSiteUrlLocally(siteUrlOrId);
}

/** gets a siteUrl locally (without making requests) (todo although currently GetFileSiteUrl does make requests...) */
export function GetSiteUrlLocally(siteUrl?: string): string {
    if (isNullOrUndefined(siteUrl)) {
        if (hasGlobalContext()) {
            siteUrl = _spPageContextInfo.webServerRelativeUrl;
            if (_spPageContextInfo.isAppWeb)//#1300 if in a classic app sub-site
                siteUrl = siteUrl.substring(0, siteUrl.lastIndexOf("/"));
        }
        else {
            siteUrl = GetFileSiteUrl(window.location.pathname);
        }
    }
    //must end with / otherwise root sites will return "" and we will think there is no site url.
    return makeServerRelativeUrl(normalizeUrl(siteUrl, true));
}

/** gets a site url, returns its REST _api url */
export function GetRestBaseUrl(siteUrl: string): string {
    siteUrl = GetSiteUrlLocally(siteUrl);
    return siteUrl + '_api';
}

/** Get the field internal name as you can find it in item.FieldValuesAsText[name] (Or FieldValuesForEdit) */
export function DecodeFieldValuesAsTextKey(key: string): string {
    return key.replace(/_x005f_/g, "_").replace('OData__', '_');
}

/** Replaces _ with _x005f_, except OData_ at the start */
export function EncodeFieldValuesAsTextKey(key: string): string {
    return key.replace('OData_', '~').replace(/_/g, "_x005f_").replace('~', 'OData_');
}

/** Gets REST FieldValuesAsText or FieldValuesForEdit and fix their column names so that you can get a field value by its internal name */
export function DecodeFieldValuesAsText(FieldValuesAsText: IDictionary<string>) {
    return DecodeFieldValuesForEdit(FieldValuesAsText);
}
/** Gets REST FieldValuesAsText or FieldValuesForEdit and fix their column names so that you can get a field value by its internal name */
export function DecodeFieldValuesForEdit(FieldValuesForEdit: IDictionary<string>) {
    let result: IDictionary<string> = {};
    Object.keys(FieldValuesForEdit).forEach(key => {
        result[DecodeFieldValuesAsTextKey(key)] = FieldValuesForEdit[key];
    });
    return result;
}

/** Get the field internal name as you can find it in the item[name] to get raw values */
export function GetFieldNameFromRawValues(
    field: { InternalName: string; TypeAsString: FieldTypeAsString; },
    //ISSUE: 1250
    options: {
        excludeIdFromName: boolean
    } = {
            excludeIdFromName: false
        }): string {
    let fieldName = field.InternalName;
    if (options.excludeIdFromName !== true && (field.TypeAsString === "User" ||
        field.TypeAsString === "UserMulti" ||
        field.TypeAsString === "Lookup" ||
        field.TypeAsString === "LookupMulti" ||
        field.InternalName === "ContentType")) {
        fieldName = fieldName += "Id";
    }

    //issue 6698 fields that are too short will encode their first letter, and will start with _. this will add OData_ as a prefix in REST
    //Issue 336 _EndDate > OData__EndDate
    if (fieldName.startsWith('_')) {
        fieldName = "OData_" + fieldName;
    }
    return fieldName;
}

/** Get the field name to set on the item update REST request */
export function getFieldNameForUpdate(field: IFieldInfoEX): string {
    if (field.TypeAsString === "TaxonomyFieldTypeMulti") {
        //Updating multi taxonomy value is allowed as string to the associated hidden text field
        return (field as IFieldTaxonomyInfo).HiddenMultiValueFieldName;
    }

    return GetFieldNameFromRawValues(field);
}

export function __isIRestError(e: any): e is IRestError {
    let x = e as IRestError;
    return !isNullOrUndefined(x) && !isNullOrUndefined(x.xhr) && isString(x.message);
}
/** extract the error message from a SharePoint REST failed request */
export function __getSPRestErrorData(restError: IRestError) {
    let code = "Unknown";
    let errorMessage = "Unspecified error";
    if (restError && restError.message) errorMessage = restError.message;
    if (restError && restError.xhr && !isNullOrEmptyString(restError.xhr.responseText)) {
        let errorData = jsonParse<{ error: { code: string; message: { value: string; }; }; }>(restError.xhr.responseText);
        let error = errorData && errorData.error;
        if (!error && errorData)//in minimal rest - error is in "odata.error"
            error = errorData && errorData["odata.error"];

        if (error) {
            if (error && error.message && error.message.value)
                errorMessage = error.message.value;
            if (error && error.code)
                code = error.code;
        }
    }
    logger.error(errorMessage);
    return { code: code, message: errorMessage } as ISPRestError;
}