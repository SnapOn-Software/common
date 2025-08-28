import { PushNoDuplicate, firstOrNull, makeUniqueArray, toHash } from "../../helpers/collections.base";
import { jsonStringify } from "../../helpers/json";
import { jsonClone } from "../../helpers/objects";
import { NormalizeListName, SPBasePermissions, SchemaJsonToXml, SchemaXmlToJson, extendFieldInfos } from "../../helpers/sharepoint";
import { normalizeGuid } from "../../helpers/strings";
import { SafeIfElse, isBoolean, isNotEmptyArray, isNullOrEmptyArray, isNullOrEmptyString, isNullOrUndefined, isNumber, isPromise, isString, isValidGuid } from "../../helpers/typecheckers";
import { makeServerRelativeUrl, normalizeUrl } from "../../helpers/url";
import { IDictionary } from "../../types/common.types";
import { IRestOptions, contentTypes, jsonTypes } from "../../types/rest.types";
import { BaseTypes, FieldTypeAsString, FieldTypes, IFieldInfo, IFieldInfoEX, IFieldInfoExHash, IFieldJsonSchema, IFieldLookupInfo, ISPEventReceiver, ListTemplateTypes, PageType, SPBasePermissionKind } from "../../types/sharepoint.types";
import { GeListItemsFoldersBehaviour, IListWorkflowAssociation, IRestItem, ListExperienceOptions, iContentType, iList, iListVersionSettings, iListView } from "../../types/sharepoint.utils.types";
import { ConsoleLogger } from "../consolelogger";
import { GetJson, GetJsonSync, longLocalCache, shortLocalCache } from "../rest";
import { GetRestBaseUrl, GetSiteUrl, LIST_EXPAND, LIST_SELECT, __getSPRestErrorData } from "./common";
import { __fixGetListItemsResults } from "./listutils/common";
import { GetContentTypes, GetContentTypesSync, GetListsSync, IGetContentTypesOptions } from "./web";

const logger = ConsoleLogger.get("SharePoint.Rest.List");

/** returns /_api/web/lists/getById() or /_api/web/lists/getByTitle() */
export function GetListRestUrl(siteUrl: string, listIdOrTitle: string): string {
    siteUrl = GetSiteUrl(siteUrl);

    let listId = GetListId(siteUrl, listIdOrTitle);

    let listPart = isValidGuid(listId) ? `getById('${normalizeGuid(listId)}')` : `getByTitle('${encodeURIComponent(listIdOrTitle)}')`;
    return GetRestBaseUrl(siteUrl) + `/web/lists/${listPart}`;
}

export function GetListId(siteUrl: string, listIdOrTitle: string): string {
    if (isNullOrEmptyString(listIdOrTitle)) return null;
    if (isValidGuid(listIdOrTitle)) return listIdOrTitle;
    //Issue 7508
    //When translation is enabled, and user changes list title but he is not on the same language as the site
    //he translates the list, but not changing its title
    //so REST api /lists/getByTitle will not work
    //instead, we need to get the list id from the web's lists collection.
    let lists = GetListsSync(siteUrl);
    var lower = listIdOrTitle.toLowerCase();
    var list = firstOrNull(lists, l => l.Title.toLowerCase() === lower);
    return list && list.Id || null;
}

/** get the list ID from a list page, such as a list view or an item form */
export function GetListIdFromPageSync(siteUrl: string, listPageUrl: string): string {
    let url = `${GetRestBaseUrl(siteUrl)}/web/getlist('${makeServerRelativeUrl(listPageUrl.split('?')[0].split('#')[0])}')?$select=id`;
    let response = GetJsonSync<{ Id: string; }>(url, null, {
        ...longLocalCache,
        jsonMetadata: jsonTypes.nometadata
    });
    if (!isNullOrUndefined(response) && response.success) {
        let listId = response.result.Id;
        return normalizeGuid(listId);
    }
    return null;
}

interface IGetSiteAssetLibraryResult { Id: string, Name: string, ServerRelativeUrl: string }
interface IGetSiteAssetLibraryReturnValue {
    value: {
        Id: string;
        RootFolder: {
            Name: string;
            ServerRelativeUrl: string;
            Exists: boolean;
        };
    }[];
}

/** ensures the site assets library exists and return its info. on errors - it will return null. */
export function EnsureAssetLibrary(siteUrl: string): Promise<IGetSiteAssetLibraryResult> {
    siteUrl = GetSiteUrl(siteUrl);

    let url = GetRestBaseUrl(siteUrl) +
        "/web/lists/EnsureSiteAssetsLibrary?$select=ID,RootFolder/Name,RootFolder/ServerRelativeUrl,RootFolder/Exists&$expand=RootFolder";
    return GetJson<{
        d: { Id: string; RootFolder: { Name: string; ServerRelativeUrl: string; Exists: boolean; }; };
    }>(url, null, { method: "POST", spWebUrl: siteUrl, ...longLocalCache }).then(result => {
        if (result && result.d) {
            return {
                Id: result.d.Id,
                Name: result.d.RootFolder.Name,
                ServerRelativeUrl: result.d.RootFolder.ServerRelativeUrl
            };
        } else return null;
    }).catch<IGetSiteAssetLibraryResult>(() => null);
}

interface IGetSitePagesLibrarResult { Id: string, Name: string, ServerRelativeUrl: string }

/** ensures the site pages library exists and return its info. on errors - it will return null. */
export async function EnsureSitePagesLibrary(siteUrl: string): Promise<IGetSitePagesLibrarResult> {
    let url = `${GetRestBaseUrl(siteUrl)}/web/lists/EnsureSitePagesLibrary`
        + `?$select=ID,RootFolder/Name,RootFolder/ServerRelativeUrl,RootFolder/Exists&$expand=RootFolder`;
    let response = await GetJson<iList>(url, null, {
        method: "POST",
        jsonMetadata: jsonTypes.nometadata,
        includeDigestInPost: true,
        ...longLocalCache
    });

    if (!isNullOrUndefined(response) && !isNullOrUndefined(response.RootFolder)) {
        return {
            Id: response.Id,
            Name: response.RootFolder.Name,
            ServerRelativeUrl: response.RootFolder.ServerRelativeUrl
        };
    }
    return null;
}

export function GetSiteAssetLibrary(siteUrl: string, sync?: false): Promise<IGetSiteAssetLibraryResult>;
export function GetSiteAssetLibrary(siteUrl: string, sync: true): IGetSiteAssetLibraryResult;
export function GetSiteAssetLibrary(siteUrl: string, sync?: boolean): IGetSiteAssetLibraryResult | Promise<IGetSiteAssetLibraryResult> {
    let reqUrl = `${GetRestBaseUrl(siteUrl)}/web/lists?`
        //Issue 1492: isSiteAssetsLibrary eq true does not work for reader users.
        //+ `$filter=isSiteAssetsLibrary eq true&$select=ID,RootFolder/Name,RootFolder/ServerRelativeUrl,RootFolder/Exists`
        + `$filter=EntityTypeName%20eq%20%27SiteAssets%27&$select=ID,RootFolder/Name,RootFolder/ServerRelativeUrl,RootFolder/Exists`
        + `&$expand=RootFolder`;

    let caller = sync ? GetJsonSync : GetJson;

    let result = caller<IGetSiteAssetLibraryReturnValue>(reqUrl, null, { ...longLocalCache, jsonMetadata: jsonTypes.nometadata });

    let transform: (v: IGetSiteAssetLibraryReturnValue) => IGetSiteAssetLibraryResult = (v) => {
        if (isNotEmptyArray(v && v.value)) {
            let assetLibrary = v.value[0];
            return {
                Id: assetLibrary.Id,
                Name: assetLibrary.RootFolder.Name,
                ServerRelativeUrl: assetLibrary.RootFolder.ServerRelativeUrl
            };
        }
        return null;
    };

    if (isPromise(result))
        return result.then(r => transform(r), () => null);
    else
        return result.success ? transform(result.result) : null;
}

/** Return the list Title */
export function GetListTitle(siteUrl: string, listIdOrTitle: string): Promise<string> {
    siteUrl = GetSiteUrl(siteUrl);

    return GetJson<{ d: { Title: string; }; }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/Title`, null, { allowCache: true })
        .then(r => {
            return r.d.Title;
        })
        .catch<string>(() => null);
}

/** Return the list */
export function GetList(siteUrlOrId: string, listIdOrTitle: string, options?: {
    includeViews?: boolean;
    viewOptions?: IListViewOptions;
    includeContentTypes?: boolean;
    includeRootFolder?: boolean;
    includeEventReceivers?: boolean;
}, refreshCache = false): Promise<iList> {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    if (isNullOrEmptyString(listIdOrTitle)) {
        return null;
    }

    return GetJson<{ d: iList; }>(GetListRestUrl(siteUrl, listIdOrTitle) + `?$select=${LIST_SELECT}&$expand=${LIST_EXPAND}`, null, { allowCache: true })
        .then(async r => {
            let list = r.d;
            if (options) {
                let promises = [];

                if (options.includeViews) {
                    promises.push(GetListViews(siteUrl, listIdOrTitle, options.viewOptions, refreshCache).then((r) => {
                        list.Views = r;
                    }))
                }
                if (options.includeContentTypes) {
                    promises.push(GetListContentTypes(siteUrl, listIdOrTitle, null, refreshCache).then((r) => {
                        list.ContentTypes = r;
                    }));
                }
                if (options.includeRootFolder) {
                    promises.push(GetListRootFolder(siteUrl, listIdOrTitle).then((r) => {
                        list.RootFolder = r;
                    }));
                }
                if (options.includeEventReceivers) {
                    promises.push(GetListEventReceivers(siteUrl, listIdOrTitle, refreshCache).then((r) => {
                        list.EventReceivers = r;
                    }));
                }

                if (promises.length > 0) {
                    await Promise.all(promises);
                }
            }

            if (list.EffectiveBasePermissions
                && (isString(list.EffectiveBasePermissions.High) || isString(list.EffectiveBasePermissions.Low))) {
                list.EffectiveBasePermissions = {
                    High: Number(list.EffectiveBasePermissions.High),
                    Low: Number(list.EffectiveBasePermissions.Low)
                };
            }

            return list;
        })
        .catch<iList>(() => null);
}
/** Return the list */
export function GetListSync(siteUrl: string, listIdOrTitle: string): iList {
    siteUrl = GetSiteUrl(siteUrl);

    if (isNullOrEmptyString(listIdOrTitle)) return null;

    let result = GetJsonSync<{ d: iList; }>(GetListRestUrl(siteUrl, listIdOrTitle) + `?$select=${LIST_SELECT}&$expand=${LIST_EXPAND}`, null, shortLocalCache);
    if (result && result.success) {
        let list = result.result.d;

        if (list.EffectiveBasePermissions
            && (isString(list.EffectiveBasePermissions.High)
                || isString(list.EffectiveBasePermissions.Low))) {
            list.EffectiveBasePermissions = {
                High: Number(list.EffectiveBasePermissions.High),
                Low: Number(list.EffectiveBasePermissions.Low)
            };
        }

        return list;
    }
    else return null;
}

export function GetListNameSync(webUrl: string, listIdOrTitle: string): string {
    let list = GetListSync(webUrl, listIdOrTitle);
    return NormalizeListName({ EntityTypeName: list.EntityTypeName, BaseType: list.BaseType });
}

export async function GetListName(webUrl: string, listIdOrTitle: string) {
    let list = await GetList(webUrl, listIdOrTitle);
    return NormalizeListName({ EntityTypeName: list.EntityTypeName, BaseType: list.BaseType });
}

export function GetListRootFolder(siteUrlOrId: string, listIdOrTitle: string): Promise<{ ServerRelativeUrl: string; Name: string; }> {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    return GetJson<{
        d: { ServerRelativeUrl: string; Name: string; };
    }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/RootFolder?$Select=Name,ServerRelativeUrl`,
        null, longLocalCache)
        .then(r => {
            return r.d;
        })
        .catch<{ ServerRelativeUrl: string; Name: string; }>(() => null);
}

export function GetListRootFolderSync(siteUrlOrId: string, listIdOrTitle: string): { ServerRelativeUrl: string; Name: string; } {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    let result = GetJsonSync<{
        d: { ServerRelativeUrl: string; Name: string; };
    }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/RootFolder?$Select=Name,ServerRelativeUrl`,
        null, longLocalCache);

    return SafeIfElse(() => result.result.d, null);
}

export function GetListField(siteUrlOrId: string, listIdOrTitle: string, fieldIdOrName: string, refreshCache?: boolean): Promise<IFieldInfo> {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    var url = GetListRestUrl(siteUrl, listIdOrTitle) + `/fields`;

    if (isValidGuid(fieldIdOrName)) {
        url += `('${normalizeGuid(fieldIdOrName)}')`;
    } else {
        url += `/getbyinternalnameortitle(@u)?@u='${encodeURIComponent(fieldIdOrName)}'`;
    }

    let result = GetJson<{ d: IFieldInfo; }>(url, null, { allowCache: refreshCache !== true })
        .then(r => {
            return r.d;
        })
        .catch<IFieldInfo>(() => null);

    return result;
}

function _getListFieldsRequestUrl(siteUrl: string, listIdOrTitle: string) {
    return GetListRestUrl(siteUrl, listIdOrTitle) + `/fields`;
}

/** Gets ID, Title, ContentType Author, Editor, Created and Modified fields */
export function GetStandardListFields(siteUrlOrId: string, listIdOrTitle: string, refreshCache?: boolean) {
    let fieldNames = ["ID", "Title", "ContentType", "Author", "Editor", "Created", "Modified"];
    return GetListFields(siteUrlOrId, listIdOrTitle, { refreshCache: refreshCache, fieldNames: fieldNames });
}

export interface IGetListFieldsOptions {
    refreshCache?: boolean;
    /** fieldNames that should be returned with the request */
    fieldNames?: string[];
}

function _processGetListFields(fields: IFieldInfo[], fieldNames: string[]) {
    if (isNullOrEmptyArray(fields)) {
        return fields as IFieldInfoEX[];
    }
    let extendedFields = extendFieldInfos(fields);

    if (!isNullOrEmptyArray(fieldNames)) {
        return extendedFields.filter((extendedField) => {
            return fieldNames.includes(extendedField.InternalName);
        });
    }
    return extendedFields;
}

export function GetListFields(siteUrlOrId: string, listIdOrTitle: string, options: IGetListFieldsOptions = {}): Promise<IFieldInfoEX[]> {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    let url = _getListFieldsRequestUrl(siteUrl, listIdOrTitle);

    let restOptions: IRestOptions = {
        allowCache: options.refreshCache !== true,
        jsonMetadata: jsonTypes.nometadata
    };

    return GetJson<{ value: IFieldInfo[]; }>(url, null, restOptions)
        .then((result) => {
            return _processGetListFields(result.value, options.fieldNames);
        }).catch<IFieldInfoEX[]>(() => {
            return null;
        });
}

export function GetListFieldsSync(siteUrlOrId: string, listIdOrTitle: string, options: IGetListFieldsOptions = {}): IFieldInfoEX[] {
    let siteUrl = GetSiteUrl(siteUrlOrId);
    let url = _getListFieldsRequestUrl(siteUrl, listIdOrTitle);

    let restOptions: IRestOptions = {
        allowCache: options.refreshCache !== true,
        jsonMetadata: jsonTypes.nometadata
    };

    let result = GetJsonSync<{ value: IFieldInfo[]; }>(url, null, restOptions);
    if (result.success && !isNullOrUndefined(result.result)) {
        return _processGetListFields(result.result.value, options.fieldNames);
    }
    return null;
}

export async function GetListFieldsAsHash(siteUrlOrId: string, listIdOrTitle: string, refreshCache?: boolean): Promise<IFieldInfoExHash> {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    let fields = await GetListFields(siteUrl, listIdOrTitle, { refreshCache: refreshCache });
    let hash: IFieldInfoExHash = {};
    if (isNotEmptyArray(fields)) {
        hash = toHash(fields, f => f.InternalName);
    }
    return hash;
}

export function GetListFieldsAsHashSync(siteUrlOrId: string, listIdOrTitle: string, refreshCache?: boolean): IFieldInfoExHash {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    let fields = GetListFieldsSync(siteUrl, listIdOrTitle, { refreshCache: refreshCache });
    let hash: IFieldInfoExHash = {};
    if (isNotEmptyArray(fields)) {
        fields.forEach(f => { hash[f.InternalName] = f; });
    }
    return hash;
}

export function GetListWorkflows(siteUrl: string, listIdOrTitle: string, refreshCache?: boolean): Promise<IListWorkflowAssociation[]> {
    siteUrl = GetSiteUrl(siteUrl);

    return GetJson<{
        d: { results: IListWorkflowAssociation[]; };
    }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/workflowAssociations`,
        null, { allowCache: refreshCache !== true })
        .then(r => {
            if (r && r.d && isNotEmptyArray(r.d.results)) {
                r.d.results.forEach(wf => {
                    wf.BaseId = normalizeGuid(wf.BaseId);
                    wf.Id = normalizeGuid(wf.Id);
                    wf.ListId = normalizeGuid(wf.ListId);
                    wf.WebId = normalizeGuid(wf.WebId);
                });
                return r.d.results;
            }
            else return [];
        })
        .catch<IListWorkflowAssociation[]>(() => []);
}

export async function GetListEffectiveBasePermissions(siteUrlOrId: string, listIdOrTitle: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    let response = await GetJson<{
        d: {
            EffectiveBasePermissions: {
                High: number; Low: number;
            };
        };
    }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/EffectiveBasePermissions`, null,
        { ...shortLocalCache });

    return response.d.EffectiveBasePermissions;
}

export function GetListEffectiveBasePermissionsSync(siteUrlOrId: string, listIdOrTitle: string) {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    let response = GetJsonSync<{
        d: {
            EffectiveBasePermissions: {
                High: number; Low: number;
            };
        };
    }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/EffectiveBasePermissions`, null,
        { ...shortLocalCache });

    return response.result.d.EffectiveBasePermissions;
}

export function UserHasManagePermissions(siteUrlOrId: string, listIdOrTitle: string): Promise<boolean> {
    return GetListEffectiveBasePermissions(siteUrlOrId, listIdOrTitle).then((effectiveBasePermissions) => {
        return new SPBasePermissions(effectiveBasePermissions).has(SPBasePermissionKind.ManageLists);
    }).catch<boolean>(() => null);
}

export function UserHasEditPermissions(siteUrlOrId: string, listIdOrTitle: string): Promise<boolean> {
    return UserHasPermissions(siteUrlOrId, listIdOrTitle, SPBasePermissionKind.EditListItems);
}

export function UserHasPermissions(siteUrlOrId: string, listIdOrTitle: string, permissionKind: SPBasePermissionKind): Promise<boolean> {
    return GetListEffectiveBasePermissions(siteUrlOrId, listIdOrTitle).then((effectiveBasePermissions) => {
        return new SPBasePermissions(effectiveBasePermissions).has(permissionKind);
    }).catch<boolean>(() => null);
}

export function UserHasPermissionsSync(siteUrlOrId: string, listIdOrTitle: string, permissionKind: SPBasePermissionKind): boolean {
    let effectiveBasePermissions = GetListEffectiveBasePermissionsSync(siteUrlOrId, listIdOrTitle);
    return new SPBasePermissions(effectiveBasePermissions).has(permissionKind);
}

/** create a new column and try to add it to default view. Send either Title and Type, or SchemaXml. Create with SchemaXml also adds to all content types */
export async function CreateField(siteUrl: string, listIdOrTitle: string, options: {
    Title?: string;
    Type?: FieldTypes;
    Required?: boolean;
    Indexed?: boolean;
    SchemaXml?: string;
    /** requies Name and StaticName for the internal name */
    SchemaXmlSpecificInternalName?: boolean;
    SkipAddToDefaultView?: boolean;
    AwaitAddToDefaultView?: boolean;
    ClientSideComponentId?: string;
    ClientSideComponentProperties?: string;
    JSLink?: string;

}): Promise<IFieldInfoEX> {
    siteUrl = GetSiteUrl(siteUrl);

    let finish = async (result: IFieldInfo) => {
        if (!result) {
            return null;
        }

        let internalName = result.InternalName;
        //we need to clear and reload the list fields cache, so call it and return our field from that collection.
        let fields = await GetListFields(siteUrl, listIdOrTitle, { refreshCache: true });

        try {
            if (options.SkipAddToDefaultView !== true) {
                if (options.AwaitAddToDefaultView === true) {
                    const views = await GetListViews(siteUrl, listIdOrTitle);
                    let defaultView = firstOrNull(views, v => v.DefaultView);
                    if (defaultView)
                        await GetJson(GetListRestUrl(siteUrl, listIdOrTitle) + `/views('${defaultView.Id}')/ViewFields/addViewField('${internalName}')`, null, { method: "POST", spWebUrl: siteUrl });
                } else {
                    GetListViews(siteUrl, listIdOrTitle).then(views => {
                        let defaultView = firstOrNull(views, v => v.DefaultView);
                        if (defaultView)
                            GetJson(GetListRestUrl(siteUrl, listIdOrTitle) + `/views('${defaultView.Id}')/ViewFields/addViewField('${internalName}')`, null, { method: "POST", spWebUrl: siteUrl });
                    });
                }
            }
        }
        catch (e) { }

        return firstOrNull(fields, f => f.InternalName === internalName);
    };

    if (!isNullOrEmptyString(options.SchemaXml)) {
        try {
            let updateObject: IDictionary<any> = {
                'parameters': {
                    '__metadata': { 'type': 'SP.XmlSchemaFieldCreationInformation' },
                    'SchemaXml': options.SchemaXml,
                    'Options': options.SchemaXmlSpecificInternalName !== true ?
                        4 ://SP.AddFieldOptions.addToAllContentTypes
                        4 | 8//SP.AddFieldOptions.addToAllContentTypes | addFieldInternalNameHint
                }
            };
            let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/fields/createFieldAsXml`;
            let newFieldResult = await GetJson<{ d: IFieldInfo; }>(url, JSON.stringify(updateObject));

            if (!isNullOrUndefined(newFieldResult)
                && !isNullOrUndefined(newFieldResult.d)) {
                if ((!isNullOrEmptyString(options.Title) && options.Title !== newFieldResult.d.Title)
                    || (isBoolean(options.Indexed) && options.Indexed !== newFieldResult.d.Indexed)) {
                    let updatedField = await UpdateField(siteUrl, listIdOrTitle, newFieldResult.d.InternalName, {
                        Title: options.Title,
                        Indexed: options.Indexed === true
                    });
                    return finish(updatedField);
                }
            }

            return finish(newFieldResult && newFieldResult.d);
        } catch {
        }
        return null;
    } else if (!isNullOrEmptyString(options.Title) && !isNullOrUndefined(options.Type)) {
        let updateObject: IDictionary<any> = {
            '__metadata': { 'type': 'SP.Field' },
            'Title': options.Title,
            'FieldTypeKind': options.Type,
            'Required': options.Required === true,
            'Indexed': options.Indexed === true
        };
        if (!isNullOrEmptyString(options.ClientSideComponentId)) {
            updateObject.ClientSideComponentId = options.ClientSideComponentId;
        }
        if (!isNullOrEmptyString(options.ClientSideComponentProperties)) {
            updateObject.ClientSideComponentProperties = options.ClientSideComponentProperties;
        }
        if (!isNullOrEmptyString(options.JSLink)) {
            updateObject.JSLink = options.JSLink;
        }

        try {
            let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/fields`;
            let newFieldResult = await GetJson<{ d: IFieldInfo; }>(url, JSON.stringify(updateObject));
            return finish(newFieldResult && newFieldResult.d);
        } catch {
        }
        return null;
    }
    else {
        console.error("You must send either SchemaXml or Title and Type");
        return null;
    }
}
/** Update field SchemaXml OR Title, only 1 update at a time supported. */
export async function UpdateField(siteUrlOrId: string, listIdOrTitle: string, fieldInternalName: string, options: {
    Title?: string;
    Indexed?: boolean;
    /** Update 'Choices' propertry on 'Choice' and 'MultiChoice' field types. */
    Choices?: string[];
    SchemaXml?: string;
    FieldType?: FieldTypeAsString;
    Required?: boolean;
    Hidden?: boolean;
    JSLink?: string;
    ClientSideComponentId?: string;
    ClientSideComponentProperties?: string;
}): Promise<IFieldInfoEX> {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    let finish = async () => {
        //we need to clear and reload the list fields cache, so call it and return our field from that collection.
        let fields = await GetListFields(siteUrl, listIdOrTitle, { refreshCache: true });
        return firstOrNull(fields, f => f.InternalName === fieldInternalName);
    };

    let fields = await GetListFieldsAsHash(siteUrl, listIdOrTitle, true);
    let thisField = fields[fieldInternalName];

    //updates can either be SchemaXml, or others. Cannot be both.
    let updates: IDictionary<any> = {
        '__metadata': { 'type': 'SP.Field' }
    };

    if (!isNullOrEmptyString(options.SchemaXml)) {
        updates.SchemaXml = options.SchemaXml;
    }
    else {
        //cannot send schema updates with other updates.
        if (!isNullOrEmptyString(options.Title)) {
            updates.Title = options.Title;
        }
        if (!isNullOrEmptyString(options.FieldType)) {
            updates.TypeAsString = options.FieldType;
        }
        if (isBoolean(options.Required)) {
            updates.Required = options.Required === true;
        }
        if (isBoolean(options.Indexed)) {
            updates.Indexed = options.Indexed === true;
        }
        if (!isNullOrEmptyArray(options.Choices)) {
            let choiceType = options.FieldType || thisField.TypeAsString;
            if (choiceType === "Choice" || choiceType === "MultiChoice") {
                updates["__metadata"]["type"] = choiceType === "Choice" ? "SP.FieldChoice" : "SP.FieldMultiChoice"
                updates.Choices = { "results": options.Choices };
            } else {
                logger.warn("Can only update 'Choices' property on 'Choice' and 'MultiChoice' field types.");
            }
        }
        if (isBoolean(options.Hidden)) {
            //this requries the CanToggleHidden to be in the schema... if not - we will need to add it before we can update this.
            let fields = await GetListFieldsAsHash(siteUrl, listIdOrTitle, false);
            let thisField = fields[fieldInternalName];
            if (thisField.Hidden !== options.Hidden) {
                if (thisField) {
                    if (thisField.SchemaJson.Attributes.CanToggleHidden !== "TRUE") {
                        await UpdateField(siteUrl, listIdOrTitle, fieldInternalName, {
                            SchemaXml:
                                thisField.SchemaXml.replace("<Field ", `<Field CanToggleHidden="TRUE" `)
                        });
                    }
                }
                updates.Hidden = options.Hidden === true;
            }
        }

        if (!isNullOrEmptyString(options.ClientSideComponentId))
            updates.ClientSideComponentId = options.ClientSideComponentId;
        if (!isNullOrEmptyString(options.ClientSideComponentProperties))
            updates.ClientSideComponentProperties = options.ClientSideComponentProperties;
        if (!isNullOrEmptyString(options.JSLink))
            updates.JSLink = options.JSLink;
    }

    if (Object.keys(updates).length > 1) {
        return GetJson(GetListRestUrl(siteUrl, listIdOrTitle) + `/fields/getbyinternalnameortitle('${fieldInternalName}')`,
            JSON.stringify(updates), { xHttpMethod: "MERGE" })
            .then(r => {
                return finish();
            })
            .catch<IFieldInfoEX>(() => null);
    }
    else {
        console.error("You must send an option to update");
        return null;
    }
}

export async function ChangeTextFieldMode(
    siteUrlOrId: string,
    listIdOrTitle: string,
    textMode: "singleline" | "multiline" | "html",
    currentField: IFieldInfoEX
) {
    const newSchema = jsonClone(currentField.SchemaJson);
    const currentSchemaAttributes = newSchema.Attributes;

    switch (textMode) {
        case "singleline":
            let shouldIntermediateUpdate = false;

            if (currentSchemaAttributes.RichText === 'TRUE') {
                currentSchemaAttributes.RichText = 'FALSE';
                shouldIntermediateUpdate = true;
            };
            if (currentSchemaAttributes.RichTextMode === 'FullHTML') {
                currentSchemaAttributes.RichTextMode = 'Compatible';
                shouldIntermediateUpdate = true;
            };

            if (shouldIntermediateUpdate) {
                const intermediateSchema = SchemaJsonToXml(newSchema);
                const intermediateUpdatedField = await UpdateField(siteUrlOrId, listIdOrTitle, currentField.InternalName, {
                    SchemaXml: intermediateSchema
                });
                // Early exit if intermediate change failed.
                if (isNullOrUndefined(intermediateUpdatedField))
                    return false;
            };

            // Actual type update.
            currentSchemaAttributes.Type = 'Text';
            delete currentSchemaAttributes.RichTextMode;
            delete currentSchemaAttributes.RichText;
            break;
        case "multiline":
            currentSchemaAttributes.Type = 'Note';
            currentSchemaAttributes.RichText = 'FALSE';
            currentSchemaAttributes.RichTextMode = 'Compatible';
            break;
        case "html":
            currentSchemaAttributes.Type = 'Note';
            currentSchemaAttributes.RichText = 'TRUE';
            currentSchemaAttributes.RichTextMode = 'FullHTML';
            break;
    }

    const updatedSchema = SchemaJsonToXml(newSchema);
    const fieldUpdated = await UpdateField(siteUrlOrId, listIdOrTitle, currentField.InternalName, {
        SchemaXml: updatedSchema
    });

    // If object is null or undefined then request has failed.
    return !isNullOrUndefined(fieldUpdated);
}

export async function ChangeDatetimeFieldMode(
    siteUrlOrId: string,
    listIdOrTitle: string,
    includeTime: boolean,
    currentField: IFieldInfoEX
) {
    const dateTimeFormat = 'DateTime';
    const dateOnlyFormat = 'DateOnly';

    const newSchema = jsonClone(currentField.SchemaJson);
    const fieldAttributes = newSchema.Attributes;
    let needUpdate = false;
    if (includeTime && fieldAttributes.Format === dateOnlyFormat) {
        needUpdate = true;
        fieldAttributes.Format = dateTimeFormat;
    }
    else if (!includeTime && fieldAttributes.Format === dateTimeFormat) {
        needUpdate = true;
        fieldAttributes.Format = dateOnlyFormat;
    }

    if (needUpdate) {
        const updatedSchema = SchemaJsonToXml(newSchema);
        const updateResponse = await UpdateField(siteUrlOrId, listIdOrTitle, currentField.InternalName, {
            SchemaXml: updatedSchema
        });
        return !isNullOrUndefined(updateResponse);
    }

    // If an already existing format was chosen.
    return true;
}

export async function DeleteField(siteUrl: string, listIdOrTitle: string, fieldInternalName: string, options?: { DeleteHiddenField?: boolean; }): Promise<boolean> {
    siteUrl = GetSiteUrl(siteUrl);

    // let finish = async () => {
    //     //we need to clear and reload the list fields cache, so call it and return our field from that collection.
    //     let fields = await GetListFields(siteUrl, listIdOrTitle, { refreshCache: true });
    //     return firstOrNull(fields, f => f.InternalName === fieldInternalName);
    // };

    if (options && options.DeleteHiddenField)
        await UpdateField(siteUrl, listIdOrTitle, fieldInternalName, { Hidden: false });


    return GetJson(GetListRestUrl(siteUrl, listIdOrTitle) + `/fields/getbyinternalnameortitle('${fieldInternalName}')`, null, {
        method: "POST",
        xHttpMethod: "DELETE"
    })
        .then(r => true)
        .catch<boolean>((e) => false);
}

export interface IListViewOptions { includeViewFields?: boolean; }

export function GetListViews(siteUrl: string, listIdOrTitle: string, options?: IListViewOptions, refreshCache = false): Promise<iListView[]> {
    siteUrl = GetSiteUrl(siteUrl);

    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/views?$select=Title,Id,ServerRelativeUrl,RowLimit,Paged,ViewQuery,ListViewXml,PersonalView,MobileView,MobileDefaultView,Hidden,DefaultView,ReadOnlyView${options && options.includeViewFields ? "&$expand=ViewFields" : ""}`
    return GetJson<{
        value: iListView[];
    }>(url,
        null, { allowCache: refreshCache !== true, jsonMetadata: jsonTypes.nometadata })
        .then(r => {
            let views = r.value;
            if (isNotEmptyArray(views)) {
                views.forEach(v => {
                    v.Id = normalizeGuid(v.Id);
                    if (options && options.includeViewFields) {
                        v.ViewFields = v.ViewFields && v.ViewFields["Items"] && v.ViewFields["Items"] || [];
                    }
                });
            }
            return views;
        })
        .catch<iListView[]>(() => null);
}

export function GetListViewsSync(siteUrl: string, listIdOrTitle: string, options?: IListViewOptions, refreshCache = false): iListView[] {
    siteUrl = GetSiteUrl(siteUrl);
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/views?$select=Title,Id,ServerRelativeUrl,RowLimit,Paged,ViewQuery,ListViewXml,PersonalView,MobileView,MobileDefaultView,Hidden,DefaultView,ReadOnlyView${options && options.includeViewFields ? "&$expand=ViewFields" : ""}`

    let response = GetJsonSync<{
        value: iListView[];
    }>(url,
        null, { allowCache: refreshCache !== true, jsonMetadata: jsonTypes.nometadata });
    if (response.success) {
        let views = response && response.result && response.result.value;
        if (isNotEmptyArray(views)) {
            views.forEach(v => { v.Id = normalizeGuid(v.Id); });
        }
        return views;
    }
    return null;
}

export async function AddViewFieldToListView(siteUrl: string, listIdOrTitle: string, viewId: string, viewField: string, refreshCache = false) {
    return _addOrRemoveViewField(siteUrl, listIdOrTitle, viewId, viewField, "addviewfield", refreshCache);
}

export async function RemoveViewFieldFromListView(siteUrl: string, listIdOrTitle: string, viewId: string, viewField: string, refreshCache = false) {
    return _addOrRemoveViewField(siteUrl, listIdOrTitle, viewId, viewField, "removeviewfield", refreshCache);
}

async function _addOrRemoveViewField(siteUrl: string, listIdOrTitle: string, viewId: string, viewField: string, action: "addviewfield" | "removeviewfield", refreshCache: boolean) {
    siteUrl = GetSiteUrl(siteUrl);

    if (isNullOrEmptyString(viewField) || !isValidGuid(viewId)) {
        return false;
    }

    let views = await GetListViews(siteUrl, listIdOrTitle, { includeViewFields: true }, refreshCache);

    if (isNullOrEmptyArray(views)) {
        return false;
    }

    let view = views.filter((view) => {
        return normalizeGuid(view.Id) === normalizeGuid(viewId);
    })[0];

    if (isNullOrUndefined(view)) {
        return false;
    }

    let hasField = view.ViewFields.includes(viewField);

    if (action === "addviewfield" && hasField === true) {
        return true;
    }

    if (action === "removeviewfield" && hasField === false) {
        return true;
    }

    try {
        let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/views('${normalizeGuid(view.Id)}')/viewfields/${action}('${viewField}')`;

        let result = await GetJson<{ d: { AddViewField?: null; RemoveViewField?: null; } }>(url, null, { method: "POST", allowCache: false });
        if (result && (result.d.AddViewField === null || result.d.RemoveViewField === null)) {
            return true;
        }
    } catch { }

    return false;
}

export function GetListContentTypes(siteUrl: string, listIdOrTitle: string,
    options?: Omit<IGetContentTypesOptions, "listIdOrTitle" | "fromRooWeb">, refreshCache = false): Promise<iContentType[]> {
    return GetContentTypes(siteUrl, { ...(options || {}), listIdOrTitle: listIdOrTitle }, refreshCache);
}

export function GetListContentTypesSync(siteUrl: string, listIdOrTitle: string,
    options?: Omit<IGetContentTypesOptions, "listIdOrTitle" | "fromRooWeb">, refreshCache = false): iContentType[] {
    return GetContentTypesSync(siteUrl, { ...(options || {}), listIdOrTitle: listIdOrTitle }, refreshCache);
}

/** generic version. for the KWIZ forms version that supports action id call GetListFormUrlAppsWeb instead */
export function GetListFormUrl(siteUrl: string, listId: string, pageType: PageType, params?: { contentTypeId?: string; itemId?: number | string; rootFolder?: string }) {
    siteUrl = GetSiteUrl(siteUrl);

    if (!isValidGuid(listId)) console.error('GetListFormUrl requires a list id');
    let url = `${normalizeUrl(siteUrl)}/_layouts/15/listform.aspx?PageType=${pageType}&ListId=${encodeURIComponent(listId)}`;
    if (params) {
        if (!isNullOrEmptyString(params.contentTypeId))
            url += `&ContentTypeId=${encodeURIComponent(params.contentTypeId)}`;
        if (!isNullOrEmptyString(params.itemId))
            url += `&ID=${encodeURIComponent(params.itemId as string)}`;
        if (!isNullOrEmptyString(params.rootFolder))
            url += `&RootFolder=${encodeURIComponent(params.rootFolder)}`;
    }
    return url;
}

export function GetFieldSchemaSync(siteUrl: string, listIdOrTitle: string, fieldInternalName: string, refreshCache?: boolean): IFieldJsonSchema {
    siteUrl = GetSiteUrl(siteUrl);

    //ISSUE: 1516 - The get schema request will fail if the field doesn't exist in the list, so we load the fields and ensure the field
    //exists before requesting the schema.
    let fields = GetListFieldsSync(siteUrl, listIdOrTitle, {
        refreshCache: refreshCache,
        fieldNames: [fieldInternalName]
    });

    if (isNullOrEmptyArray(fields)) {
        return null;
    }

    let field = fields[0];
    return SchemaXmlToJson(field.SchemaXml);
    // let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/fields/getByInternalNameOrTitle('${fieldInternalName}')?$select=SchemaXml`;
    // let result = GetJsonSync<{ d: { SchemaXml: string; }; }>(
    //     url,
    //     null,
    //     {
    //         ...shortLocalCache,
    //         forceCacheUpdate: refreshCache === true
    //     });

    // if (result && result.success) {
    //     return SchemaXmlToJson(result.result.d.SchemaXml);
    // }
    // return null;
    //#endregion
}

export async function GetFieldSchema(siteUrl: string, listIdOrTitle: string, fieldInternalName: string, refreshCache?: boolean) {
    siteUrl = GetSiteUrl(siteUrl);

    //ISSUE: 1516 - The get schema request will fail if the field doesn't exist in the list, so we load the fields and ensure the field
    //exists before requesting the schema
    let fields = await GetListFields(siteUrl, listIdOrTitle, {
        refreshCache: refreshCache,
        fieldNames: [fieldInternalName]
    });

    if (isNullOrEmptyArray(fields)) {
        return null;
    }

    let field = fields[0];
    return SchemaXmlToJson(field.SchemaXml);
}

export async function GetListItems(siteUrl: string, listIdOrTitle: string, options: {
    /** Optional, default: 1000. 0: get all items. */
    rowLimit?: number;
    /** Id, Title, Modified, FileLeafRef, FileDirRef, FileRef, FileSystemObjectType */
    columns: (string | IFieldInfoEX)[];
    foldersBehaviour?: GeListItemsFoldersBehaviour;
    /** Optional, request to expand some columns. */
    expand?: string[];
    /** allow to change the jsonMetadata for this request, default: verbose */
    jsonMetadata?: jsonTypes;
    refreshCache?: boolean;
    /** allow to send a filter statement */
    $filter?: string;
}): Promise<IRestItem[]> {
    let info = _GetListItemsInfo(siteUrl, listIdOrTitle, options);

    let items: IRestItem[] = [];

    do {
        let resultItems: IRestItem[] = [];
        let next: string = null;
        if (info.noMetadata) {
            let requestResult = (await GetJson<{
                value: IRestItem[];
                "odata.nextLink": string;
            }>(info.requestUrl, null, {
                allowCache: options.refreshCache !== true,
                jsonMetadata: options.jsonMetadata
            }));
            resultItems = requestResult.value;
            next = requestResult["odata.nextLink"];
        }
        else {
            let requestResult = (await GetJson<{
                d: {
                    results: IRestItem[];
                    __next?: string;
                };
            }>(info.requestUrl, null, {
                allowCache: options.refreshCache !== true
            }));
            resultItems = requestResult.d.results;
            next = requestResult.d.__next;
        }

        if (isNotEmptyArray(resultItems))
            items.push(...resultItems);

        if (info.totalNumberOfItemsToGet > items.length)
            info.requestUrl = next;
        else
            info.requestUrl = null;

    } while (!isNullOrEmptyString(info.requestUrl));

    return __fixGetListItemsResults(siteUrl, listIdOrTitle, items, options.foldersBehaviour, info.expandedLookupFields);
}

export function GetListItemsSync(siteUrl: string, listIdOrTitle: string, options: {
    /** Optional, default: 1000. 0: get all items. */
    rowLimit?: number;
    /** Id, Title, Modified, FileLeafRef, FileDirRef, FileRef, FileSystemObjectType */
    columns: (string | IFieldInfoEX)[];
    foldersBehaviour?: GeListItemsFoldersBehaviour;
    /** Optional, request to expand some columns. */
    expand?: string[];
    /** allow to send a filter statement */
    $filter?: string;
}): IRestItem[] {
    let info = _GetListItemsInfo(siteUrl, listIdOrTitle, options);

    let items: IRestItem[] = [];

    do {
        let resultItems: IRestItem[] = [];
        let next: string = null;
        if (info.noMetadata) {
            let requestResult = GetJsonSync<{
                value: IRestItem[];
                "odata.nextLink": string;
            }>(info.requestUrl, null, { allowCache: true });
            if (requestResult.success) {
                resultItems = requestResult.result.value;
                next = requestResult.result["odata.nextLink"];
            }
        }
        else {
            let requestResult = GetJsonSync<{
                d: { results: IRestItem[]; __next?: string; };
            }>(info.requestUrl, null, { allowCache: true });
            if (requestResult.success) {
                resultItems = requestResult.result.d.results;
                next = requestResult.result.d.__next;
            }
        }

        if (isNotEmptyArray(resultItems))
            items.push(...resultItems);

        if (info.totalNumberOfItemsToGet > items.length)
            info.requestUrl = next;
        else
            info.requestUrl = null;

    } while (!isNullOrEmptyString(info.requestUrl));

    return __fixGetListItemsResults(siteUrl, listIdOrTitle, items, options.foldersBehaviour, info.expandedLookupFields);
}

function _GetListItemsInfo(siteUrl: string, listIdOrTitle: string, options: {
    /** Optional, default: 1000. 0: get all items. */
    rowLimit?: number;
    /** Id, Title, Modified, FileLeafRef, FileDirRef, FileRef, FileSystemObjectType */
    columns: (string | IFieldInfoEX)[];
    /** Optional, request to expand some columns. */
    expand?: string[];
    /** allow to change the jsonMetadata for this request, default: verbose */
    jsonMetadata?: jsonTypes;
    /** allow to send a filter statement */
    $filter?: string;
}) {
    siteUrl = GetSiteUrl(siteUrl);

    let url = GetListRestUrl(siteUrl, listIdOrTitle) + `/items`;
    let queryParams: string[] = [];

    //Issue 8189 expand lookup fields
    let columns: string[] = [];
    let expand: string[] = [];
    let expandedLookupFields: IFieldInfoEX[] = [];
    options.columns.forEach(c => {
        if (isString(c)) columns.push(c);
        else {
            let internalName = c.InternalName;
            //Issue 828, 336
            if (internalName.startsWith("_")) internalName = `OData_${internalName}`;

            let isLookupField = c.TypeAsString === "Lookup" || c.TypeAsString === "LookupMulti";
            let isUserField = c.TypeAsString === "User" || c.TypeAsString === "UserMulti";

            if (isLookupField || isUserField) {
                //ISSUE: 1519 - Added lookupField property to able to retrieve value of the additional lookup field key
                let lookupField = (c as IFieldLookupInfo).LookupField;
                if (!isNullOrEmptyString(lookupField) && isLookupField) {
                    columns.push(`${internalName}/${lookupField}`);
                }
                //we want to expand it
                columns.push(`${internalName}/Title`);
                columns.push(`${internalName}/Id`);
                expand.push(internalName);
                expandedLookupFields.push(c);
            }
            else columns.push(internalName);
        }
    });
    if (isNotEmptyArray(options.expand)) {
        expand.push(...options.expand);
    }

    //add the ones we need
    PushNoDuplicate(columns, "Id");
    PushNoDuplicate(columns, "FileRef");
    PushNoDuplicate(columns, "FileSystemObjectType");

    queryParams.push(`$select=${encodeURIComponent(makeUniqueArray(columns).join(','))}`);

    if (isNotEmptyArray(expand))
        queryParams.push(`$expand=${encodeURIComponent(makeUniqueArray(expand).join(','))}`);

    let batchSize = 2000;
    let limit = options.rowLimit >= 0 && options.rowLimit < batchSize ? options.rowLimit : batchSize;
    let totalNumberOfItemsToGet = !isNumber(options.rowLimit) || options.rowLimit < 1 ? 99999 : options.rowLimit > batchSize ? options.rowLimit : limit;

    if (!isNullOrEmptyString(options.$filter))
        queryParams.push(`$filter=${options.$filter}`);
    queryParams.push(`$top=${limit}`);

    let requestUrl = url + (queryParams.length > 0 ? '?' + queryParams.join('&') : '');
    let noMetadata = options.jsonMetadata === jsonTypes.nometadata;

    return { requestUrl, noMetadata, totalNumberOfItemsToGet, expandedLookupFields };
}

/** Find an item by id, even if it is nested in a sub-folder */
export function FindListItemById(items: IRestItem[], itemId: number): IRestItem {
    for (let i = 0; i < items.length; i++) {
        let current = items[i];
        if (current.Id === itemId) return current;
        else if (isNotEmptyArray(current.__Items))//folder? look inside
        {
            let nestedResult = FindListItemById(current.__Items, itemId);
            if (!isNullOrUndefined(nestedResult)) return nestedResult;
        }
    }
    //not found
    return null;
}

function _getListEventReceiversRequestUrl(siteUrl: string, listIdOrTitle: string) {
    return GetListRestUrl(siteUrl, listIdOrTitle) + `/EventReceivers`
}

export async function GetListEventReceivers(siteUrl: string, listIdOrTitle: string, refreshCache?: boolean): Promise<ISPEventReceiver[]> {
    try {
        let url = _getListEventReceiversRequestUrl(siteUrl, listIdOrTitle);
        let response = await GetJson<{
            value: ISPEventReceiver[];
        }>(url,
            null, {
            allowCache: refreshCache !== true,
            jsonMetadata: jsonTypes.nometadata
        });

        return !isNullOrUndefined(response) ? response.value : null;
    } catch {
    }

    return null;
}

export async function AddListEventReceiver(siteUrl: string, listIdOrTitle: string, eventReceiverDefinition: Pick<ISPEventReceiver, "EventType" | "ReceiverName" | "ReceiverUrl" | "SequenceNumber">): Promise<ISPEventReceiver> {
    let newEventReceiver: Omit<ISPEventReceiver, "ReceiverId" | "Synchronization"> = {
        ReceiverAssembly: "",
        ReceiverClass: "",
        ...eventReceiverDefinition
    };

    try {
        let url = _getListEventReceiversRequestUrl(siteUrl, listIdOrTitle);
        let response = await GetJson<ISPEventReceiver>(url, JSON.stringify(newEventReceiver), {
            method: "POST",
            includeDigestInPost: true,
            jsonMetadata: jsonTypes.nometadata,
            headers: {
                "content-type": contentTypes.json
            }
        });

        return !isNullOrUndefined(response) && isValidGuid(response.ReceiverId) ? response : null;
    } catch {
    }

    return null;
}

export async function DeleteListEventReceiver(siteUrl: string, listIdOrTitle: string, eventReceiverId: string): Promise<boolean> {
    try {
        let url = `${_getListEventReceiversRequestUrl(siteUrl, listIdOrTitle)}('${normalizeGuid(eventReceiverId)}')/deleteObject`;
        let response = await GetJson<{ "odata.null": boolean }>(url, null, {
            method: "POST",
            includeDigestInPost: true,
            jsonMetadata: jsonTypes.nometadata
        });

        return !isNullOrUndefined(response) && response["odata.null"] === true;
    } catch {
    }

    return false;
}

/** timestamp of changes:
 * - item updates
 * - changes to columns
 * - content types
 * - list versioning settings
 * - list title/description
 * - content approval settings
 * does not track:
 * - Changes to views
 * - changing list/items permissions
 */
export function GetListLastItemModifiedDate(siteUrl: string, listIdOrTitle: string, options: {
    sync: true;
    refreshCache?: boolean;
    /** ignore system changes */
    userChangesOnly?: boolean;
}): string;
/** timestamp of changes:
 * - item updates
 * - changes to columns
 * - content types
 * - list versioning settings
 * - list title/description
 * - content approval settings
 * does not track:
 * - Changes to views
 * - changing list/items permissions
 */
export function GetListLastItemModifiedDate(siteUrl: string, listIdOrTitle: string, options?: {
    sync?: false;
    refreshCache?: boolean;
    /** ignore system changes */
    userChangesOnly?: boolean;
}): Promise<string>;

export function GetListLastItemModifiedDate(siteUrl: string, listIdOrTitle: string, options?: {
    sync?: boolean;
    refreshCache?: boolean;
    /** ignore system changes */
    userChangesOnly?: boolean;
}): string | Promise<string> {
    siteUrl = GetSiteUrl(siteUrl);

    let endPoint = options && options.userChangesOnly ? 'LastItemUserModifiedDate' : 'LastItemModifiedDate';

    let sync = options && options.sync ? true : false;
    let caller = sync ? GetJsonSync : GetJson;

    let result = caller<{ value: string; }>(GetListRestUrl(siteUrl, listIdOrTitle) + `/${endPoint}`, null, {
        allowCache: true,//in memory only
        jsonMetadata: jsonTypes.nometadata,
        forceCacheUpdate: options && options.refreshCache === true || false
    });

    if (isPromise(result))
        return result.then(r => r.value, () => null);
    else
        return result.success ? result.result.value : null;
}

export async function ReloadListLastModified(siteUrl: string, listIdOrTitle: string) {
    await GetListLastItemModifiedDate(siteUrl, listIdOrTitle, { refreshCache: true });
    //make sure we do it for both title and id, we don't know how the other callers may use this in their API

    if (!isValidGuid(listIdOrTitle)) {
        try {
            var listId = GetListId(siteUrl, listIdOrTitle);
            await GetListLastItemModifiedDate(siteUrl, listId, { refreshCache: true });
        } catch (e) { }
    }
    else {
        try {
            var listTitle = await GetListTitle(siteUrl, listIdOrTitle);
            await GetListLastItemModifiedDate(siteUrl, listTitle, { refreshCache: true });
        } catch (e) { }
    }
}

export async function ListHasUniquePermissions(siteUrl: string, listIdOrTitle: string): Promise<boolean> {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/?$select=hasuniqueroleassignments`;
    let has = await GetJson<{ HasUniqueRoleAssignments: boolean }>(url, undefined, { allowCache: false, jsonMetadata: jsonTypes.nometadata });
    return has.HasUniqueRoleAssignments === true;
}
export async function RestoreListPermissionInheritance(siteUrl: string, listIdOrTitle: string): Promise<void> {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/ResetRoleInheritance`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function BreakListPermissionInheritance(siteUrl: string, listIdOrTitle: string, clear = true): Promise<void> {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/breakroleinheritance(copyRoleAssignments=${clear ? 'false' : 'true'}, clearSubscopes=true)`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function AssignListPermission(siteUrl: string, listIdOrTitle: string, principalId: number, roleId: number) {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/roleassignments/addroleassignment(principalid=${principalId},roleDefId=${roleId})`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}
export async function RemoveListPermission(siteUrl: string, listIdOrTitle: string, principalId: number, roleId: number) {
    let url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/roleassignments/removeroleassignment(principalid=${principalId},roleDefId=${roleId})`;
    await GetJson(url, undefined, { method: "POST", allowCache: false, jsonMetadata: jsonTypes.nometadata, spWebUrl: siteUrl });
}

interface iCreateListResult {
    AllowContentTypes: boolean,
    BaseTemplate: ListTemplateTypes,
    BaseType: BaseTypes,
    ContentTypesEnabled: boolean,
    Created: string,
    DefaultItemOpenUseListSetting: boolean,
    Description: string,
    DisableCommenting: boolean,
    DisableGridEditing: boolean,
    DocumentTemplateUrl: string,//"/sites/s/cms/CMSLayouts/Forms/template.dotx",
    DraftVersionVisibility: 0,
    EnableAttachments: boolean,
    EnableFolderCreation: boolean,
    EnableMinorVersions: boolean,
    EnableModeration: false,
    EnableRequestSignOff: boolean,
    EnableVersioning: boolean,
    EntityTypeName: string,//"CMSLayouts",
    ExemptFromBlockDownloadOfNonViewableFiles: boolean,
    FileSavePostProcessingEnabled: boolean,
    ForceCheckout: boolean,
    HasExternalDataSource: boolean,
    Hidden: boolean,
    Id: string,//"c21d4eb4-70cc-4c95-925a-aa34bb9e01e0",
    ImagePath: {
        DecodedUrl: string,//"/_layouts/15/images/itdl.png?rev=47"
    },
    ImageUrl: string,//"/_layouts/15/images/itdl.png?rev=47",
    IsApplicationList: boolean,
    IsCatalog: boolean,
    IsPrivate: boolean,
    ItemCount: 0,
    LastItemDeletedDate: string,//"2024-02-05T18:26:05Z",
    LastItemModifiedDate: string,//"2024-02-05T18:26:06Z",
    LastItemUserModifiedDate: string,//"2024-02-05T18:26:05Z",
    ListExperienceOptions: ListExperienceOptions,
    ListItemEntityTypeFullName: string,//"SP.Data.CMSLayoutsItem",
    MajorVersionLimit: number,//500,
    MajorWithMinorVersionsLimit: number,//0,
    MultipleDataList: boolean,
    NoCrawl: boolean,
    ParentWebPath: {
        DecodedUrl: string,//"/sites/s/cms"
    },
    ParentWebUrl: string,//"/sites/s/cms",
    ParserDisabled: boolean,
    ServerTemplateCanCreateFolders: boolean,
    TemplateFeatureId: string,//"00bfea71-e717-4e80-aa17-d0c71b360101",
    Title: string,//"CMSLayouts"
}
export async function CreateList(siteUrl: string, info: {
    title: string; description: string;
    type: BaseTypes; template: ListTemplateTypes;
}): Promise<iCreateListResult> {
    let url = `${GetRestBaseUrl(siteUrl)}/web/lists`;
    const body = {
        __metadata: { type: 'SP.List' },
        AllowContentTypes: false,
        ContentTypesEnabled: false,
        BaseTemplate: info.template,
        BaseType: info.type,
        Description: info.description,
        Title: info.title
    };

    let newList = (await GetJson<{ d: iCreateListResult }>(url, jsonStringify(body))).d;
    normalizeGuid(newList.Id);
    return newList;
}

export async function RecycleList(siteUrl: string, listIdOrTitle: string): Promise<{ recycled: boolean; errorMessage?: string}> {
    siteUrl = GetSiteUrl(siteUrl);
    const url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/recycle()`;
    const result: { recycled: boolean; errorMessage?: string; } = { recycled: true };

    try {
        await GetJson<{ d: {Recycle: string; } }>(
            url, null,
            {
                method: "POST",
                allowCache: false,
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl
            }
        );
    } catch (e) {
        result.recycled = false;
        result.errorMessage = __getSPRestErrorData(e).message;
    }

    return result;
}

export async function DeleteList(siteUrl: string, listIdOrTitle: string): Promise<{ deleted: boolean; errorMessage?: string }> {
    siteUrl = GetSiteUrl(siteUrl);
    const url = `${GetListRestUrl(siteUrl, listIdOrTitle)}/deleteObject`;
    const result: { deleted: boolean; errorMessage?: string } = { deleted: true };

    try {
        await GetJson(
            url, null,
            {
                method: "POST",
                xHttpMethod: "DELETE",
                allowCache: false,
                jsonMetadata: jsonTypes.nometadata,
                spWebUrl: siteUrl
            }
        );
    } catch (e) {
        result.deleted = false;
        result.errorMessage = __getSPRestErrorData(e).message;
    }

    return result;
}

export async function SearchList(siteUrl: string, listIdOrTitle: string, query: string) {
    let listId = GetListId(siteUrl, listIdOrTitle);
    let url = `${GetRestBaseUrl(siteUrl)}/search/query?querytext='(${query}*)'&querytemplate='{searchTerms} (NormListID:${listId})'`;

    try {
        const result = await GetJson<{
            ElapsedTime: number,
            PrimaryQueryResult: {
                CustomResults: [];
                QueryId: string;//"7fdf01b1-f6f0-4d42-b046-d9db22597084",
                QueryRuleId: string;// "00000000-0000-0000-0000-000000000000",
                RefinementResults: null,
                RelevantResults: {
                    RowCount: number,
                    Table: {
                        Rows: {
                            Cells: {
                                Key:
                                /** "1989637621861439888" "Edm.Int64" */
                                "WorkId"
                                /** "1000.1073372","Edm.Double" */
                                | "Rank"
                                /** "sample md as text","Edm.String" */
                                | "Title"
                                /** "Shai Petel", "Edm.String" */
                                | "Author"
                                /** "91", "Edm.Int64" */
                                | "Size"
                                /** "https://kwizcom.sharepoint.com/sites/s/cms/CMSPages/sample md as text.txt", "Edm.String" */
                                | "Path"
                                /** null, "Null" */
                                | "Description"
                                /** "# hello world! - bullet - bullet | table | col | | ----- | ---- | |table |col | ", "Edm.String" */
                                | "HitHighlightedSummary"
                                /** "https://kwizcom.sharepoint.com/_api/v2.1/drives/b!8NAeO-mocUWbgyMTqcM0Mfh8XKPhn7xOhhMrO5KfJjBs_gXb9j8ZRaLxuppgj0Uk/items/01OBXW4FLU6G4LIT7AX5BK3MXHDICVTIOT/thumbnails/0/c400x99999/content?prefer=noRedirect", "Edm.String" */
                                | "PictureThumbnailURL"
                                /** null,"Null" */
                                | "ServerRedirectedURL"
                                /** null,"Null" */
                                | "ServerRedirectedEmbedURL"
                                /** null,"Null" */
                                | "ServerRedirectedPreviewURL"
                                /** "txt","Edm.String" */
                                | "FileExtension"
                                /** "0x010100CB212272F1372446A2423F0A2BEA12B8", "Edm.String" */
                                | "ContentTypeId"
                                /** "https://kwizcom.sharepoint.com/sites/s/cms/CMSPages/Forms/AllItems.aspx","Edm.String" */
                                | "ParentLink"
                                /** "1","Edm.Int64" */
                                | "ViewsLifeTime"
                                /** "1","Edm.Int64" */
                                | "ViewsRecent"
                                /** "2024-02-22T18:35:48.0000000Z","Edm.DateTime" */
                                | "LastModifiedTime"
                                /** "txt","Edm.String" */
                                | "FileType"
                                /** "1989637621861439888","Edm.Int64" */
                                | "DocId"
                                /** "https://kwizcom.sharepoint.com/sites/s/cms","Edm.String" */
                                | "SPWebUrl"
                                /** "{b4b8f174-e04f-42bf-adb2-e71a0559a1d3}","Edm.String" */
                                | "UniqueId"
                                /** "3b1ed0f0-a8e9-4571-9b83-2313a9c33431","Edm.String" */
                                | "SiteId"
                                /** "a35c7cf8-9fe1-4ebc-8613-2b3b929f2630","Edm.String" */
                                | "WebId"
                                /** "db05fe6c-3ff6-4519-a2f1-ba9a608f4524","Edm.String" */
                                | "ListId"
                                /** "https://kwizcom.sharepoint.com/sites/s/cms/CMSPages/sample md as text.txt","Edm.String" */
                                | "OriginalPath"
                                ;
                                Value: string,
                                ValueType: "Edm.Int64" | "Edm.Double" | "Edm.String" | "Edm.DateTime" | "Null"
                            }[]
                        }[]
                    },
                    TotalRows: number,
                    TotalRowsIncludingDuplicates: number
                }
            },
        }>(url, null, { jsonMetadata: jsonTypes.nometadata });
        logger.json(result.PrimaryQueryResult.RelevantResults, `search ${query}`);
        let rows = result.PrimaryQueryResult.RelevantResults.Table.Rows;

        const mapped: (IDictionary<string | Date | number> & {
            WorkId?: number;
            Rank?: number;
            Title?: string;
            Author?: string;
            Size?: number;
            Path?: string;
            Description?: string;
            HitHighlightedSummary?: string;
            PictureThumbnailURL?: string;
            ServerRedirectedURL?: string;
            ServerRedirectedEmbedURL?: string;
            ServerRedirectedPreviewURL?: string;
            FileExtension?: string;
            ContentTypeId?: string;
            ParentLink?: string;
            ViewsLifeTime?: number;
            ViewsRecent?: number;
            LastModifiedTime?: Date;
            FileType?: string;
            DocId?: number;
            SPWebUrl?: string;
            UniqueId?: string;
            SiteId?: string;
            WebId?: string;
            ListId?: string;
            OriginalPath?: string;
            $itemId?: number;
        })[] = [];
        rows.forEach(r => {
            try {
                const rowValues: IDictionary<string | Date | number> = {};
                r.Cells.forEach(cell => {
                    rowValues[cell.Key] = cell.ValueType === "Edm.Int64" || cell.ValueType === "Edm.Double"
                        ? parseInt(cell.Value, 10)
                        : cell.ValueType === "Edm.DateTime"
                            ? new Date(cell.Value)
                            : cell.ValueType === "Null"
                                ? ""
                                : cell.Value
                });
                let resultPath = isNullOrEmptyString(rowValues.Path) ? "" : (rowValues.Path as string).toLowerCase();
                let indexOfId = resultPath.toLowerCase().indexOf("id=");
                let itemId = indexOfId >= 0 ? parseInt(resultPath.slice(indexOfId + 3)) : -1;
                if (itemId >= 0)
                    rowValues.$itemId = itemId;
                mapped.push(rowValues);
            } catch (e) { return null; }
        });

        return mapped;
    } catch (e) {
        logger.error(e);
    }

    return [];
}

export async function UpdateListExperience(siteUrl: string, listId: string, experience: ListExperienceOptions) {
    try {
        let url = GetListRestUrl(siteUrl, listId);
        let data = {
            "ListExperienceOptions": experience
        };
        let result = await GetJson(url, JSON.stringify(data), {
            xHttpMethod: "MERGE",
            jsonMetadata: jsonTypes.nometadata
        });
        return isNullOrEmptyString(result);
    } catch (e) {
        logger.error(e);
    }
    return false;
}

export async function GetListVersionSettings(siteUrlOrId: string, listIdOrTitle: string, options?: { refreshCache?: boolean }): Promise<iListVersionSettings> {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    if (isNullOrEmptyString(listIdOrTitle)) return null;

    try {
        const result = await GetJson<iListVersionSettings>(GetListRestUrl(siteUrl, listIdOrTitle) + `?$select=EnableMinorVersions,EnableVersioning,DraftVersionVisibility,MajorWithMinorVersionsLimit,MajorVersionLimit,EnableModeration`, null, {
            allowCache: options && options.refreshCache ? false : true,
            jsonMetadata: jsonTypes.nometadata
        });
        return result;
    } catch {
        const result_1: iListVersionSettings = null;
        return result_1;
    }
}
export async function SetListVersionSettings(siteUrlOrId: string, listIdOrTitle: string, options: {
    newSettings: Pick<iListVersionSettings, "EnableMinorVersions" | "EnableModeration" | "DraftVersionVisibility">
}): Promise<iListVersionSettings> {
    let siteUrl = GetSiteUrl(siteUrlOrId);

    if (isNullOrEmptyString(listIdOrTitle)) return null;

    try {
        function updateProp(prop: Partial<iListVersionSettings>) {
            return GetJson<iListVersionSettings>(GetListRestUrl(siteUrl, listIdOrTitle),
                jsonStringify(prop), {
                method: "POST", spWebUrl: siteUrl,
                xHttpMethod: "MERGE",
                jsonMetadata: jsonTypes.nometadata
            });
        }

        const currentValues = await GetListVersionSettings(siteUrlOrId, listIdOrTitle, { refreshCache: true });
        //replace undefined props with current values
        const newSettings: iListVersionSettings = { ...currentValues, ...options.newSettings }


        //need to do some of the changes one by one...
        if (newSettings.EnableMinorVersions) {
            if (!currentValues.EnableMinorVersions)
                await updateProp({ EnableMinorVersions: true });

            if (!isNullOrUndefined(newSettings.DraftVersionVisibility)) {
                if (currentValues.DraftVersionVisibility !== newSettings.DraftVersionVisibility)
                    await updateProp({ DraftVersionVisibility: newSettings.DraftVersionVisibility });
            }
        }
        else {
            if (currentValues.EnableMinorVersions) {
                await updateProp({ EnableMinorVersions: false });
            }
        }

        if (newSettings.EnableMinorVersions && newSettings.EnableModeration) {
            if (!currentValues.EnableModeration)
                await updateProp({ EnableModeration: true });
        }
        else {
            if (currentValues.EnableModeration) {
                await updateProp({ EnableModeration: false });
            }
        }

        return await GetListVersionSettings(siteUrlOrId, listIdOrTitle, { refreshCache: true });
    } catch {
        const result: iListVersionSettings = null;
        return result;
    }
}
