import { IDictionary } from "../types/common.types";
import { FieldTypeAsString, FieldTypes, IFieldCalculatedInfo, IFieldInfo, IFieldInfoEX, IFieldJsonSchema, IFieldTaxonomyInfo, PrincipalType, RententionLabelFieldValueType, SPBasePermissionKind, ThumbnailValueType, UrlValueType } from "../types/sharepoint.types";
import { UserEntityValueType } from "../types/sharepoint.utils.types";
import { ConsoleLogger } from "../utils/consolelogger";
import { getCacheItem, setCacheItem } from "../utils/localstoragecache";
import { GetJson, GetJsonSync, longLocalCache } from "../utils/rest";
import { GetListRootFolderSync, GetListSync, GetListViewsSync } from "../utils/sharepoint.rest/list";
import { GetCurrentUserSync } from "../utils/sharepoint.rest/user";
import { GetSiteIdSync, GetWebIdSync } from "../utils/sharepoint.rest/web";
import { isElement, waitFor, waitForWindowObject } from "./browser";
import { firstOrNull, forEach } from "./collections.base";
import { deleteCookie, getCookie, setCookie } from "./cookies";
import { isValidEmail } from "./emails";
import { jsonParse } from "./json";
import { hasOwnProperty } from "./objects";
import { isValidDomainLogin, normalizeGuid } from "./strings";
import { isNotEmptyArray, isNotEmptyString, isNullOrEmptyString, isNullOrNaN, isNullOrUndefined, isNumber, isNumeric, isString, isTypeofFullNameFunction, isTypeofFullNameNullOrUndefined, isTypeofFullNameUndefined, isUndefined, isValidGuid } from "./typecheckers";
import { getQueryStringParameter, makeServerRelativeUrl, normalizeUrl } from "./url";

export const KWIZ_CONTROLLER_FIELD_NAME = "kwizcomcontrollerfield";
const MODERN_EXPERIENCE_COOKIE_NAME = "splnu";
const MODERN_EXPERIENCE_TEMP_COOKIE_NAME = `${MODERN_EXPERIENCE_COOKIE_NAME}_kwizcom_original`;
const MOBILE_EXPERIENCE_COOKIE_NAME = "mobile";
const MOBILE_EXPERIENCE_TEMP_COOKIE_NAME = `${MOBILE_EXPERIENCE_COOKIE_NAME}_kwizcom_original`;

const logger = ConsoleLogger.get("_modules/helpers/sharepoint");
export function IsClassicPage() {
    if (!isTypeofFullNameUndefined("_spClientSideComponentIds")) {
        //only modern pages have the _spClientSideComponentIds object created on the page inline, not a in script that 
        //can be loaded
        return false;
    }

    if (!isTypeofFullNameUndefined("_spWebPartComponents")
        || !isTypeofFullNameUndefined("g_Workspace")
        || isTypeofFullNameFunction("$_global_ie55up")
        || !isTypeofFullNameUndefined("_spBodyOnLoadCalled")
    ) {
        //_spWebPartComponents = inline global var that contains web part info
        //g_Workspace = inline global var that contains the worskpace element selector
        //$_global_ie55up = global function for IE polyfills on classic pages
        //_spBodyOnLoadCalled = inline global var
        return true;
    }

    if (!isTypeofFullNameNullOrUndefined("document.body.childNodes")
        && document.body.childNodes.length > 0) {
        //only classic pages have the s4-workspace element
        let s4workspaceEle = document.getElementById("s4-workspace");
        if (isElement(s4workspaceEle)) {
            return true;
        }
    }

    return false;
}

export function restoreExperience() {
    var splnu_original = getCookie(MODERN_EXPERIENCE_TEMP_COOKIE_NAME);
    deleteCookie(MODERN_EXPERIENCE_TEMP_COOKIE_NAME);
    deleteCookie(MODERN_EXPERIENCE_COOKIE_NAME);

    if (isString(splnu_original)) {
        setCookie(MODERN_EXPERIENCE_COOKIE_NAME, splnu_original);
    }

    var mobile_original = getCookie(MOBILE_EXPERIENCE_TEMP_COOKIE_NAME);
    deleteCookie(MOBILE_EXPERIENCE_TEMP_COOKIE_NAME);
    deleteCookie(MOBILE_EXPERIENCE_COOKIE_NAME);

    if (isString(mobile_original)) {
        setCookie(MOBILE_EXPERIENCE_COOKIE_NAME, mobile_original, null, "/");
    }
}

export function ensureClassicExperience(listId: string) {
    var splnu = getCookie(MODERN_EXPERIENCE_COOKIE_NAME);
    var mobile = getCookie(MOBILE_EXPERIENCE_COOKIE_NAME);
    if (isString(splnu)) {
        setCookie(MODERN_EXPERIENCE_TEMP_COOKIE_NAME, splnu);
    }
    if (isString(mobile)) {
        setCookie(MOBILE_EXPERIENCE_TEMP_COOKIE_NAME, mobile);
    }
    setCookie(MOBILE_EXPERIENCE_COOKIE_NAME, "0", null, "/");
    switchToClassicExperience(listId);
}

export function setExperienceCookie(value: string, reload?: boolean) {
    setCookie(MODERN_EXPERIENCE_COOKIE_NAME, value);
    if (reload === true) {
        window.location.reload();
    }
}

export function switchToClassicExperience(listId: string, reload?: boolean) {
    setExperienceCookie(listId ? `{${normalizeGuid(listId)}}` : "0", reload);
}

export function switchToModernExperience(reload?: boolean) {
    setExperienceCookie("1", reload);
}

/** Gets field schema XML and converts it into JSON object */
export function SchemaXmlToJson(xml: string): IFieldJsonSchema {
    let result: IFieldJsonSchema = { Attributes: {}, Customizations: {} };
    try {
        if (xml) {
            //IE9+ supports this, we don't need to support IE8 anymore
            let SchemaXmlDoc: Document = new DOMParser().parseFromString(xml, "text/xml");
            let xField = SchemaXmlDoc.getElementsByTagName("Field")[0];
            for (var i = 0; i < xField.attributes.length; i++) {
                result.Attributes[xField.attributes[i].name] = xField.attributes[i].value;
            }

            let properties = xField.querySelectorAll("Customization>ArrayOfProperty>Property");
            properties.forEach(p => {
                let name = p.querySelector("Name");
                let value = p.querySelector("Value");
                if (name && value && !isNullOrEmptyString(name.textContent))
                    result.Customizations[name.textContent] = value.textContent;
            });
        }
    } catch (e) { }
    return result;
}

export function SchemaJsonToXml(json: IFieldJsonSchema): string {
    let doc = new Document();
    let fieldElm = doc.createElement("Field");
    forEach(json.Attributes, (name, value) => {
        fieldElm.setAttribute(name, value);
    });
    if (Object.keys(json.Customizations).length) {
        let custElm = doc.createElement("Customization");
        fieldElm.appendChild(custElm);
        let arrElm = doc.createElement("ArrayOfProperty");
        custElm.appendChild(arrElm);
        forEach(json.Customizations, (name, value) => {
            let propElm = doc.createElement("Property");
            arrElm.appendChild(propElm);

            let nameElm = doc.createElement("Name");
            propElm.appendChild(nameElm);
            let valElm = doc.createElement("Value");
            propElm.appendChild(valElm);
            nameElm.textContent = name;
            valElm.textContent = value;
        });
    }
    if (isNotEmptyArray(json["Choices"])) {
        let choices = doc.createElement("CHOICES");
        fieldElm.appendChild(choices);
        json["Choices"].forEach(c => {
            let choice = doc.createElement("CHOICE");
            choice.textContent = c;
            choices.appendChild(choice);
        });
    }
    return fieldElm.outerHTML;
}

export function NormalizeListName(list: { EntityTypeName: string; BaseType: number; }): string {
    let Name = list.EntityTypeName;//get list name. if it is a list, it will be [Name]List so cut the list out.
    try {
        if (list.BaseType === 0 && Name.endsWith("List"))
            Name = Name.substr(0, Name.length - 4);//remove List
    } catch (e) { }
    return Name;
}

export class SPBasePermissions {
    private $High = 0;
    private $Low = 0;
    public constructor(EffectiveBasePermissions: SPBasePermissionKind | { High: number; Low: number; }) {
        if (!isNullOrUndefined((EffectiveBasePermissions as any).High))
            this.initPropertiesFromJson((EffectiveBasePermissions as { High: number; Low: number; }));
        else this.set(EffectiveBasePermissions as SPBasePermissionKind);
    }
    public set(perm: SPBasePermissionKind) {
        if (perm === SPBasePermissionKind.FullMask) {
            this.$Low = 65535;
            this.$High = 32767;
            return;
        }

        if (!perm) {
            this.$Low = 0;
            this.$High = 0;
            return;
        }
        var $v_0 = perm;

        $v_0 = $v_0 - 1;
        var $v_1 = 1;

        if ($v_0 >= 0 && $v_0 < 32) {
            $v_1 = $v_1 << $v_0;
            this.$Low = this.$Low | $v_1;
        }
        else if ($v_0 >= 32 && $v_0 < 64) {
            $v_1 = $v_1 << $v_0 - 32;
            this.$High = this.$High | $v_1;
        }
    }
    public clear(perm) {
        var $v_0 = perm;

        $v_0 = $v_0 - 1;
        var $v_1 = 1;

        if ($v_0 >= 0 && $v_0 < 32) {
            $v_1 = $v_1 << $v_0;
            $v_1 = ~$v_1;
            this.$Low = this.$Low & $v_1;
        }
        else if ($v_0 >= 32 && $v_0 < 64) {
            $v_1 = $v_1 << $v_0 - 32;
            $v_1 = ~$v_1;
            this.$High = this.$High & $v_1;
        }
    }
    public clearAll() {
        this.$High = 0;
        this.$Low = 0;
    }
    public has(perm: SPBasePermissionKind) {
        if (!perm) {
            return true;
        }
        if (perm === SPBasePermissionKind.FullMask) {
            return (this.$High & 32767) === 32767 && this.$Low === 65535;
        }
        var $v_0 = perm;

        $v_0 = $v_0 - 1;
        var $v_1 = 1;

        if ($v_0 >= 0 && $v_0 < 32) {
            $v_1 = $v_1 << $v_0;
            return 0 !== (this.$Low & $v_1);
        }
        else if ($v_0 >= 32 && $v_0 < 64) {
            $v_1 = $v_1 << $v_0 - 32;
            return 0 !== (this.$High & $v_1);
        }
        return false;
    }
    public hasAny(...requestedPerms: SPBasePermissionKind[]) {
        return (requestedPerms || []).some((t) => {
            return this.has(t);
        });
    }
    public haAll(...requestedPerms: SPBasePermissionKind[]) {
        return (requestedPerms || []).every((t) => {
            return this.has(t);
        });
    }
    public hasPermissions(requestedPerms: { High: number; Low: number; }) {
        return (this.$High & requestedPerms.High) === requestedPerms.High && (this.$Low & requestedPerms.Low) === requestedPerms.Low;
    }
    public hasAnyPermissions(...requestedPerms: { High: number; Low: number; }[]) {
        return (requestedPerms || []).some((t) => {
            return this.hasPermissions(t);
        });
    }
    public hasAllPermissions(...requestedPerms: { High: number; Low: number; }[]) {
        return (requestedPerms || []).every((t) => {
            return this.hasPermissions(t);
        });
    }
    public initPropertiesFromJson(EffectiveBasePermissions: { High: number; Low: number; }) {
        this.$High = 0;
        this.$Low = 0;
        if (isNullOrUndefined(EffectiveBasePermissions)) return;

        if (!isNullOrNaN(EffectiveBasePermissions.High)) {
            this.$High = EffectiveBasePermissions.High;
        }
        if (!isNullOrNaN(EffectiveBasePermissions.Low)) {
            this.$Low = EffectiveBasePermissions.Low;
        }
    }
    public toJson() {
        return { High: this.$High, Low: this.$Low };
    }
}

export interface ISPPeoplePickerControlFormEntity {
    /** ie: i:0#.f|membership|user@kwizcom.com */
    Key: string;
    EntityType: "FormsRole" | "SecGroup" | "SPGroup";
    EntityData?: {
        SPGroupID?: string;
        PrincipalType?: "User" | "SecurityGroup" | "SharePointGroup";
        /** string of number "8" */
        SPUserID?: string;
        SIPAddress?: string;
        Email?: string;
    };
    Resolved?: boolean;
}

/** remove i:0#.f|membership| prefix from login */
export function CleanupUserClaimsLogin(login: string) {
    if (login.indexOf('|membership|') >= 0)
        return login.slice(login.lastIndexOf('|') + 1);
    else return login;
}

export function IsSPPeoplePickerControlFormEntity(entity: any): entity is ISPPeoplePickerControlFormEntity {
    let asType = entity as ISPPeoplePickerControlFormEntity;
    return !isNullOrUndefined(entity)
        && !isNullOrEmptyString(asType.Key)
        && (!isNullOrUndefined(asType.EntityData) || !isNullOrUndefined(asType.Resolved));
}

export function getPrincipalTypeFromPickerEntity(entity: ISPPeoplePickerControlFormEntity): PrincipalType.SecurityGroup | PrincipalType.SharePointGroup | PrincipalType.User {
    if (entity.EntityType === "FormsRole"
        || entity.EntityType === "SecGroup"
        || entity.EntityData && entity.EntityData.PrincipalType === "SecurityGroup") {
        return PrincipalType.SecurityGroup;
    }

    if (entity.EntityType === "SPGroup"
        || entity.EntityData && (isNumeric(entity.EntityData.SPGroupID) || entity.EntityData.PrincipalType === "SharePointGroup")) {
        return PrincipalType.SharePointGroup;
    }

    if (entity.EntityType === "User" || entity.EntityType === "" && entity.EntityData && entity.EntityData.PrincipalType === "User") {
        if (entity.EntityData && isValidEmail(entity.EntityData.Email) || isString(entity.EntityData.SIPAddress)) {
            return PrincipalType.User;
        }

        var keyparts = entity.Key.split("|");
        if (keyparts.length === 3 && isValidEmail(keyparts[keyparts.length - 1])) {
            //sharepoint online key for a user is in the form xxxx|membership|email;
            return PrincipalType.User;
        } else if (keyparts.length === 2 && isValidDomainLogin(keyparts[keyparts.length - 1])) {
            //sharepoint onpremise key for a user is in the form xxxx|domain\\user;
            return PrincipalType.User;
        } else {
            //SharePoint groups on saved classic forms item are shown with EntityType = User but dont have a SIPAddress/Email
            //and the key does not contain a valid domain login/email
            return PrincipalType.SharePointGroup;
        }
    }

    return PrincipalType.User;
}

/** rest object might put array values under ".results", this will place them at the property value directly */
export function NormalizeRestObject<T>(o: T): T {
    //extract collections such as choice field "choices"
    if (o) {
        Object.keys(o as any).forEach(key => {
            if (!isNullOrUndefined(o[key]) && hasOwnProperty(o[key], "results") && Array.isArray(o[key].results))
                o[key] = o[key].results;
        });
    }
    return o;
}

/**
 * Extends a field info into field info EX (adding SchemaJson)
 * @param field REST field data
 * @param allFields Optional - all list fields, used for discovering multi TaxonomyField's update hidden text field
 */
export function extendFieldInfo(field: IFieldInfo, allFields?: IFieldInfo[]): IFieldInfoEX {
    let fieldEx = field as IFieldInfoEX;
    fieldEx.Id = normalizeGuid(field.Id);

    if (field.InternalName === "ContentType") {
        fieldEx.Required = true;
    }
    else {
        switch (fieldEx.TypeAsString) {
            case "TaxonomyFieldTypeMulti"://find the hidden rich text for updates!
                {
                    let taxonomyField = (fieldEx as IFieldTaxonomyInfo);
                    let textFieldId = normalizeGuid(taxonomyField.TextField);
                    let related = isNotEmptyArray(allFields) ? firstOrNull(allFields, relatedField => relatedField.Id === textFieldId) : null;
                    if (related !== null)
                        taxonomyField.HiddenMultiValueFieldName = related.InternalName;
                }
                break;
        }
    }

    fieldEx.OutputTypeAsString = getFieldOutputType(fieldEx);

    if (isNullOrUndefined(fieldEx.SchemaJson)) {
        Object.defineProperty(fieldEx, 'SchemaJson', {
            get: function () {
                if (isUndefined(this._schemaJson)) {
                    this._schemaJson = SchemaXmlToJson(this.SchemaXml);
                }
                return this._schemaJson;
            }
        });
    }

    if (field.InternalName === KWIZ_CONTROLLER_FIELD_NAME) {
        //not hidden by SharePoint so its shown in views/forms but as far as our products concerned - should be treated as hidden
        field.Hidden = true;
    }

    return fieldEx;
}

export function extendFieldInfos(fields: IFieldInfo[]) {
    return fields.map(f => extendFieldInfo(f, fields));
}

export function getFieldOutputType(field: IFieldInfo) {
    let outputType = field.TypeAsString;

    if (outputType === "Calculated") {
        switch ((field as IFieldCalculatedInfo).OutputType) {
            case FieldTypes.DateTime:
                outputType = "DateTime";
                break;
            case FieldTypes.Boolean:
                outputType = "Boolean";
                break;
            case FieldTypes.Currency:
                outputType = "Currency";
                break;
            case FieldTypes.Number:
                outputType = "Number";
                break;
            default:
                outputType = "Text";
                break;
        }
    }

    return outputType as FieldTypeAsString;
}

export function isDocLib(list?: { BaseType: number; }): boolean {
    return list && list.BaseType === 1;
}

export function GetOrderByFromCaml(camlQuery: string): { Name: string; IsAscending: boolean; }[] {
    let xmlDoc = new DOMParser().parseFromString(camlQuery, "text/xml");

    let orderByElm = xmlDoc.querySelector("OrderBy");
    let OrderBy: { Name: string; IsAscending: boolean; }[] = [];
    if (orderByElm) {
        let orderFieldsElms = orderByElm.querySelectorAll("FieldRef");
        orderFieldsElms.forEach(f => {
            let name = f.getAttribute("Name");
            let asc = f.getAttribute("Ascending") || "";
            //Issue 1019 default value is true if ommitted - https://learn.microsoft.com/en-us/sharepoint/dev/schema/fieldref-element-query
            let IsAscending = asc.toUpperCase() !== "FALSE";
            if (!isNullOrEmptyString(name))
                OrderBy.push({ Name: name, IsAscending: IsAscending });
        });
    }

    return OrderBy;
}

export function RemoveOrderByFromCaml(camlQuery: string): string {
    let xmlDoc = new DOMParser().parseFromString(camlQuery, "text/xml");

    let orderByElm = xmlDoc.querySelector("OrderBy");
    //let OrderBy: { Name: string; IsAscending: boolean; }[] = [];
    if (orderByElm) {
        orderByElm.remove();
        return xmlDoc.documentElement.outerHTML;
    }

    return camlQuery;
}

export function EnsureViewFields(camlQuery: string, fields: string[], forceCreateViewFields: boolean, removeAllOthers?: boolean) {
    let xmlDoc = new DOMParser().parseFromString(camlQuery, "text/xml");
    let viewElm = xmlDoc.querySelector("View");
    if (!isNullOrUndefined(viewElm)) {
        let viewFieldsElm = viewElm.querySelector("ViewFields");

        if (forceCreateViewFields && isNullOrUndefined(viewFieldsElm)) {
            viewFieldsElm = xmlDoc.createElement("ViewFields");
            viewElm.appendChild(viewFieldsElm);
        }

        if (!isNullOrUndefined(viewFieldsElm)) {
            let viewFieldsElms = viewFieldsElm.querySelectorAll("FieldRef");

            if (removeAllOthers)
                viewFieldsElms.forEach(e => e.remove());

            let viewFields = removeAllOthers ? [] : Array.from(viewFieldsElms).map(viewFieldNode => {
                let name = viewFieldNode.getAttribute("Name");
                return name.toLowerCase();
            });

            let changed = false;
            fields.forEach(f => {
                if (viewFields.indexOf(f.toLowerCase()) === -1) {
                    let newViewFieldElm = xmlDoc.createElement("FieldRef");
                    newViewFieldElm.setAttribute("Name", f);
                    viewFieldsElm.appendChild(newViewFieldElm);
                    changed = true;
                }
            });

            if (viewFieldsElm.querySelectorAll("FieldRef").length < 1 && !forceCreateViewFields) {
                //don't leave an empty object
                viewFieldsElm.remove();
                changed = true;
            }

            if (changed) return xmlDoc.documentElement.outerHTML;
        }
    }

    return camlQuery;
}

/**If it is a thumbnail field - parse and return a typed value */
export function ParseThumbnalFieldValue(value?: string, context?: {
    itemId: number;
    rootFolder: string;
}): ThumbnailValueType {
    if (!isNullOrEmptyString(value)) {
        try {
            let parsed = jsonParse<ThumbnailValueType>(value);

            if (isNullOrUndefined(parsed)) {
                return null;
            }

            if (!isNullOrEmptyString(parsed.serverRelativeUrl)) {
                return parsed;
            } else if (!isNullOrEmptyString(parsed.fileName)
                && !isNullOrUndefined(context)
                && isNumber(context.itemId)
                && !isNullOrEmptyString(context.rootFolder)) {
                let { itemId, rootFolder } = context;
                parsed.serverRelativeUrl = `${makeServerRelativeUrl(rootFolder)}/Attachments/${itemId}/${parsed.fileName}`
                return parsed;
            }
        } catch (e) {
        }
    }
    return null;
}

export function isTitleField(fieldName: string) {
    return fieldName === "Title" || fieldName === "LinkTitleNoMenu" || fieldName === "LinkTitle";
}

/** we are on a list view page, not a web part page with possible multiple list views */
export function isSingleViewPage() {
    return !isNullOrUndefined(_spPageContextInfo) && isValidGuid(_spPageContextInfo.viewId);
}

/**
 * Splits the ViewFields of a CAML query into separate entries based on the batch size.
 * @param {string} camlQuery - The CAML query string.
 * @param {number} batchSize - The size of each batch (number of ViewFields per entry).
 */
export function splitViewFieldsByBatch(camlQuery: string, allListFieldsToLowerHash: IDictionary<IFieldInfoEX>, batchSize: number): string[] {
    let xmlDoc = new DOMParser().parseFromString(camlQuery, 'text/xml');
    let viewNode = xmlDoc.querySelector("View, view");
    let viewFieldsNode = viewNode && viewNode.querySelector("ViewFields, viewfields");

    if (isNullOrUndefined(viewFieldsNode)) {
        return [camlQuery]; // No ViewFields element found, return the original query as is
    }

    let viewFieldNodes = Array.from(viewFieldsNode.children);
    let numberOfEntries = Math.ceil(viewFieldNodes.length / batchSize);

    let splitQueries: string[] = [];
    for (let i = 0; i < numberOfEntries; i++) {
        let startIndex = i * batchSize;
        let endIndex = startIndex + batchSize;
        let slicedViewFields = viewFieldNodes.slice(startIndex, endIndex);

        let clonedXmlDoc = xmlDoc.cloneNode(true) as XMLDocument;
        let clonedViewFieldsElement = clonedXmlDoc.getElementsByTagName('ViewFields')[0];

        // Remove existing child nodes from cloned ViewFields
        while (clonedViewFieldsElement.firstChild) {
            clonedViewFieldsElement.removeChild(clonedViewFieldsElement.firstChild);
        }

        // Append sliced ViewFields to cloned ViewFields
        for (let slicedViewField of slicedViewFields) {
            clonedViewFieldsElement.appendChild(slicedViewField.cloneNode(true));
        }

        let splitQuery = new XMLSerializer().serializeToString(clonedXmlDoc);
        splitQueries.push(splitQuery);
    }

    return splitQueries;
}

/** Size=S = 48×48 px, M = 72×72 px, L = 300×300 px */
export function UserPhoto(siteUrl: string, userName: string, size: "S" | "M" | "L" = "L") {
    return `${normalizeUrl(siteUrl)}/_layouts/15/userphoto.aspx?size=${size}&accountname=${encodeURIComponent(userName)}`;
}

export function IsFolderContentType(contentTypeId: string) {
    //item:0x0100
    //file:0x0101
    //folder:0x0120
    //item in MS Lists:0x00 Issue 7121
    return contentTypeId.startsWith("0x0120");
}

export enum PageContainerTypes {
    M365SPFx, M365OOBListForm,
    SP2019SPFx, SP2019ListForm
}
export function GetModernPageContainers() {
    let mainContent: HTMLElement = document.querySelector("section.mainContent");
    if (mainContent)
        return { mainContent, commandBar: document.querySelector(".commandBarWrapper") as HTMLElement, type: PageContainerTypes.M365SPFx };

    mainContent = document.querySelector("div[class^=canvasWrapper]");//document.querySelector("div.SPCanvas");
    if (mainContent)
        return { mainContent, commandBar: document.querySelector(".commandBarWrapper") as HTMLElement, type: PageContainerTypes.SP2019SPFx };

    mainContent = document.querySelector(".flex-mainColumn");
    if (mainContent)
        return { mainContent, commandBar: null, type: PageContainerTypes.M365OOBListForm };

    mainContent = document.querySelector(".Files-mainColumn");
    if (mainContent)
        return { mainContent, commandBar: null, type: PageContainerTypes.SP2019ListForm };

    return { mainContent: null, commandBar: null, type: PageContainerTypes.SP2019ListForm };
}

export function AddCamlQueryFragmentToViewQuery(viewXml: string, queryFragmentXml: string): string {

    const combineWithExistingConditions = (doc: XMLDocument, existingConditions: Element[], newConditionXml: string): Element => {
        const parser = new DOMParser();
        const newConditionDoc = parser.parseFromString(newConditionXml, 'text/xml');
        const newCondition = doc.importNode(newConditionDoc.documentElement, true);

        if (existingConditions.length === 0) {
            return newCondition;
        } else if (existingConditions.length === 1) {
            const andElement = doc.createElement("And");
            andElement.appendChild(existingConditions[0]);
            andElement.appendChild(newCondition);
            return andElement;
        } else {
            const lastCondition = existingConditions.pop();
            const andElement = doc.createElement("And");
            andElement.appendChild(combineWithExistingConditions(doc, existingConditions, ""));
            andElement.appendChild(lastCondition);
            return andElement;
        }
    }
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(viewXml, 'text/xml');
        const whereClause = xmlDoc.querySelector('Where') || xmlDoc.createElement('Where');
        const existingConditions = Array.from(whereClause.children);

        const combinedCondition = combineWithExistingConditions(xmlDoc, existingConditions, queryFragmentXml);
        whereClause.textContent = ''; // Clear existing conditions
        whereClause.appendChild(combinedCondition);

        const query = xmlDoc.querySelector('Query') || xmlDoc.createElement('Query');
        query.appendChild(whereClause);

        const view = xmlDoc.querySelector('View') || xmlDoc.createElement('View');
        view.appendChild(query);

        const serializer = new XMLSerializer();
        let modifiedCamlXml = serializer.serializeToString(xmlDoc);

        return modifiedCamlXml;
    } catch (error) {
        return viewXml;
    }
}

export function IsUserEntityValueType(value: any): value is UserEntityValueType {
    if (isNullOrUndefined(value) || isString(value)) {
        return false;
    }
    var asUserEntityValueType = value as UserEntityValueType;
    var isEntityValueType =
        asUserEntityValueType.principalType === PrincipalType.SharePointGroup
        || asUserEntityValueType.principalType === PrincipalType.User
        || asUserEntityValueType.principalType === PrincipalType.SecurityGroup;

    return isEntityValueType;
}

export function IsMultiUserEntityValueType(value: any[]): value is UserEntityValueType[] {
    if (isNullOrUndefined(value) || isString(value) || !Array.isArray(value)) {
        return false;
    }

    return value.every((v) => {
        return IsUserEntityValueType(v);
    });
}

export function IsUrlValueType(value: any): value is UrlValueType {
    if (isNullOrUndefined(value) || isString(value)) {
        return false;
    }
    let asType = value as UrlValueType;
    return !isNullOrUndefined(asType.Url) && !isNullOrUndefined(asType.Description);
}

export function IsRetentionLabelValueType(value: any): value is RententionLabelFieldValueType {
    if (isNullOrUndefined(value) || isString(value)) {
        return false;
    }
    let asType = value as RententionLabelFieldValueType;
    return isValidGuid(asType.TagId) && !isNullOrEmptyString(asType.TagName);
}

export function isHostedInTeams() {
    return window.location.pathname.toLowerCase().indexOf("teamshostedapp.aspx") >= 0;
}
export function isClassicAppIframe() {
    return window.location.search.toLowerCase().indexOf("sphosturl=") >= 0 &&
        window.location.search.toLowerCase().indexOf("spappweburl=") >= 0;
}

export function isNumberFieldType(fieldInfo: IFieldInfoEX) {
    let targetColumnOutputType = getFieldOutputType(fieldInfo);
    return targetColumnOutputType === "Currency"
        || targetColumnOutputType === "Number"
        || targetColumnOutputType === "Counter"
        || targetColumnOutputType === "Integer";
}

export async function isSharePointOnline() {
    if (isSPOCommonUrl() === true
        || isSPOCachedURL() === true
        || (!isTypeofFullNameNullOrUndefined("_spPageContextInfo") && _spPageContextInfo.isSPO === true)) {
        return true;
    }

    // Can be an expensive call
    await isSPPageContextInfoReady();

    return getAndCacheIsSharePointOnlineResult();
}

export function isSharePointOnlineSync() {
    if (isSPOCommonUrl() === true
        || isSPOCachedURL() === true
        || (!isTypeofFullNameNullOrUndefined("_spPageContextInfo") && _spPageContextInfo.isSPO === true)) {
        return true;
    }

    // Can be an expensive call
    isSPPageContextInfoReadySync();

    return getAndCacheIsSharePointOnlineResult();
}

function isSPOCommonUrl() {
    let url = new URL(window.location.href);
    //Most cases are satisfied by this check. Very few customers have custom domains for SharePoint online.
    if (url.host.toLowerCase().endsWith(".sharepoint.com")) {
        return true;
    }
    return false;
}

function isSPOCachedURL() {
    let isSPO = getCacheItem<boolean>(`${window.location.host}_isSPO`);
    return isSPO === true;
}

function getAndCacheIsSharePointOnlineResult() {
    let isSPO = !isTypeofFullNameUndefined("_spPageContextInfo") && _spPageContextInfo.isSPO === true;
    setCacheItem(`${window.location.host}_isSPO`, isSPO === true, { days: 365 });
    return isSPO === true;
}

export async function isAppWeb() {
    let contextReady = await waitFor(() => {
        return !isTypeofFullNameUndefined("_spPageContextInfo");
    });

    if (contextReady) {
        return _spPageContextInfo.isAppWeb === true;
    }

    return false;
}

export function isAppWebSync() {
    if (!isTypeofFullNameUndefined("_spPageContextInfo")) {
        return _spPageContextInfo.isAppWeb === true;
    }

    return false;
}

export async function isSPPageContextInfoReady() {
    const contextReady = await waitForWindowObject("_spPageContextInfo", null, 333);

    if (contextReady !== true) {
        let pageAsJson = await GetPageAsJson();
        if (!isNullOrUndefined(pageAsJson) && !isNullOrUndefined(pageAsJson.spPageContextInfo)) {
            globalThis["_spPageContextInfo"] = pageAsJson.spPageContextInfo;
        }
    }

    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo")) {
        expandPageContext();
        return true;
    }

    return false;
}

export function isSPPageContextInfoReadySync() {    
    const contextReady = !isTypeofFullNameNullOrUndefined("_spPageContextInfo");

    if (contextReady !== true) {
        let pageAsJson = GetPageAsJsonSync();
        if (!isNullOrUndefined(pageAsJson) && !isNullOrUndefined(pageAsJson.spPageContextInfo)) {
            globalThis["_spPageContextInfo"] = pageAsJson.spPageContextInfo;
        }
    }

    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo")) {
        expandPageContext();
        return true;
    }

    return false;
}

export function isExternalUser(loginName: string) {
    if (isNullOrEmptyString(loginName)) return false;
    return loginName.indexOf("#ext#@") >= 0;
}

function expandPageContext() {
    logger.groupSync("expandPageContext", log => {
        if((_spPageContextInfo as any)["_hasExpandPageContext"] === true){
            return;
        }

        const ctx = _spPageContextInfo;
        (ctx as any)["_hasExpandPageContext"] = true;

        if (isNullOrUndefined(ctx.siteId)) {
            log("GetSiteIdSync");
            ctx.siteId = GetSiteIdSync(ctx.siteServerRelativeUrl);
        }

        if (isNullOrEmptyString(ctx.webId)) {
            log("GetWebIdSync");
            ctx.webId = GetWebIdSync(ctx.webServerRelativeUrl);
        }

        if (isNullOrUndefined(ctx.hasManageWebPermissions) && !isNullOrUndefined(ctx.webPermMasks)) {
            log("hasManageWebPermissions");
            let webPerms = new SPBasePermissions(_spPageContextInfo.webPermMasks);
            ctx.hasManageWebPermissions = webPerms.has(SPBasePermissionKind.ManageWeb);
        }

        if (isNullOrEmptyString(ctx.listId)) {
            log("ctx.listId");
            ctx.listId = ctx.pageListId;
        }
        
        if (isNotEmptyString(ctx.listId)) {
            //has list
            if (isNullOrEmptyString(ctx.listUrl)) {
                log("GetListRootFolderSync");
                ctx.listUrl = GetListRootFolderSync(ctx.webServerRelativeUrl, ctx.listId).ServerRelativeUrl;
            }

            if (isNullOrNaN(ctx.listBaseTemplate)) {
                log("GetListSync");
                const list = GetListSync(ctx.webServerRelativeUrl, ctx.listId);
                ctx.listTitle = list.Title;
                ctx.listBaseTemplate = list.BaseTemplate;
                //ctx.listBaseType = list.BaseType;
                ctx.listPermsMask = list.EffectiveBasePermissions;
            }

            if (isNullOrUndefined(ctx.pageItemId)) {
                log("ctx.pageItemId");
                let idParam = getQueryStringParameter("ID");
                if (isNotEmptyString(idParam) && isNumeric(idParam)) {
                    ctx.pageItemId = Number(idParam);
                }
            }

            if (isNullOrNaN(ctx.pageItemId)) {
                //no item, in a view
                if (isNullOrUndefined(ctx.viewId)) {
                    log("GetListViewsSync");
                    const viewEndsWith = window.location.pathname.substr(window.location.pathname.lastIndexOf("/")).toLowerCase();
                    const views = GetListViewsSync(ctx.webServerRelativeUrl, ctx.listId);
                    const view = firstOrNull(views, v => v.ServerRelativeUrl.toLowerCase().endsWith(viewEndsWith));
                    if (view)
                        ctx.viewId = view.Id;
                }
            }

            if (isNullOrEmptyString(ctx.userEmail)) {
                log("GetCurrentUserSync");
                const user = GetCurrentUserSync(ctx.webServerRelativeUrl);
                ctx.userEmail = user.Email;
                ctx.userDisplayName = user.Title;
            }

            log({ label: "expanded", value: ctx });
        }
    });
}

function _getPageAsJsonRequestParams(url?: string) {
    if (isNullOrEmptyString(url)) {
        url = window.location.pathname;
    }

    return [
        `${url}?as=json`,
        null,
        {
            ...longLocalCache,
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "ACCEPT": "application/json; odata.metadata=minimal",
                "ODATA-VERSION": "4.0"
            }
        }
    ] as Parameters<typeof GetJson>;
}
export async function GetPageAsJson(url?: string) {
    try {
        let response = await GetJson<{
            spPageContextInfo: typeof _spPageContextInfo
        }>(..._getPageAsJsonRequestParams(url));

        return response;
    } catch {
    }

    return null;
}

export function GetPageAsJsonSync(url?: string) {
    try {
        let response = GetJsonSync<{
            spPageContextInfo: typeof _spPageContextInfo
        }>(..._getPageAsJsonRequestParams(url));

        return response.success === true ? response.result : null;
    } catch {
    }

    return null;
}