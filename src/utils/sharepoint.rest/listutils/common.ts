import { lastIndexOf, toHash } from "../../../helpers/collections.base";
import { isNotEmptyArray, isNullOrEmptyString, isNullOrUndefined, isNumber } from "../../../helpers/typecheckers";
import { IDictionary } from "../../../types/common.types";
import { jsonTypes } from "../../../types/rest.types";
import { FileSystemObjectTypes, IFieldInfoEX, IFieldLookupInfo } from "../../../types/sharepoint.types";
import { GeListItemsFoldersBehaviour, IRestItem } from "../../../types/sharepoint.utils.types";
import { ConsoleLogger } from "../../consolelogger";
import { DecodeFieldValuesAsTextKey, GetFieldNameFromRawValues } from "../common";
import { GetItemsByIdSync } from "./GetListItemsById";

const logger = ConsoleLogger.get("utils/sharepoint.rest/listutils/common");

export function __fixGetListItemsResults(siteUrl: string, listIdOrTitle: string, items: IRestItem[], foldersBehaviour?: GeListItemsFoldersBehaviour, expandedLookupFields?: IFieldInfoEX[]): IRestItem[] {
    let folders: { [folderPath: string]: IRestItem; } = {};

    let itemFileRefMap: IDictionary<{ FileRef: string; FileSystemObjectType: FileSystemObjectTypes }> = {};
    if (isNotEmptyArray(items) && isNullOrUndefined(items[0].FileRef)) {
        //customer support ticket - request was missing teh FileRef column!
        let additionalItems = GetItemsByIdSync(siteUrl, listIdOrTitle, items.map(i => i.Id), {
            select: ["Id", "FileRef", "FileSystemObjectType"],
            jsonMetadata: jsonTypes.nometadata
        });
        itemFileRefMap = toHash(additionalItems, i => i.Id.toString(10));
    }

    items.forEach(item => {
        try {
            if (itemFileRefMap[item.Id]) {
                let mappedValue = itemFileRefMap[item.Id];
                item.FileRef = mappedValue.FileRef;
                item.FileSystemObjectType = mappedValue.FileSystemObjectType;
            }

            let fileRef = item.FileRef as string || "";
            let parts = fileRef.split('/');
            item.FileLeafRef = parts.pop() || "";
            item.FileDirRef = parts.join('/');
            item.FileOrFolderName = item.FileLeafRef.split('.')[0];

            if (item.FileSystemObjectType === 1) {
                item.FileType = "folder";
                item.__Items = [];
                folders[fileRef.toLowerCase()] = item;
                item.__DisplayTitle = item.FileLeafRef;
            }
            else {
                //issue 8094 file name might have multiple dots
                let splitDot = item.FileLeafRef.split('.');
                item.FileType = splitDot.length > 1 ? splitDot.pop().toLowerCase() : "folder";
                item.__DisplayTitle = splitDot.join('.');
                if (item.FileType === '000') {
                    item.FileType = 'listitem';
                    item.__DisplayTitle = item.Title;
                    if (isNullOrEmptyString(item.__DisplayTitle))
                        item.__DisplayTitle = `Item #${item.Id}`;
                }
            }

            if (isNotEmptyArray(expandedLookupFields))
                expandedLookupFields.forEach((f: IFieldLookupInfo) => {
                    //ISSUE: 1519
                    let lookupField = f.LookupField;

                    //ISSUE: 1250 - expanded lookup fields with names that start with '_'
                    //will be returned as OData__name. We have to use the field name returned
                    //from GetFieldNameFromRawValues without the 'Id' appended to the name because
                    //the value has been expanded.
                    let fieldInternalName = f.InternalName;
                    let rawValue = item[f.InternalName];
                    if (isNullOrUndefined(rawValue)) {
                        fieldInternalName = GetFieldNameFromRawValues(f, {
                            excludeIdFromName: true
                        });

                        rawValue = item[fieldInternalName];
                    }

                    if (rawValue) {
                        item.FieldValuesAsText = item.FieldValuesAsText || {};

                        let value: { Id: number; Title: string;[InternalName: string]: any } | { Id: number; Title: string;[InternalName: string]: any }[] = rawValue;
                        if (Array.isArray(value))//multi value
                        {
                            let id: number[] = [];
                            let text: string[] = [];
                            value.forEach(v => {
                                id.push(v.Id);
                                if (!isNullOrEmptyString(lookupField) && !isNullOrUndefined(v[lookupField])) {
                                    text.push(v[lookupField]);
                                } else {
                                    text.push(v.Title);
                                }
                            });
                            item[`${fieldInternalName}Id`] = id;
                            item.FieldValuesAsText[DecodeFieldValuesAsTextKey(fieldInternalName)] = text.join(", ");
                        }
                        else if (isNumber(value && value.Id)) {
                            item[`${fieldInternalName}Id`] = value.Id;
                            //ISSUE: 1519 - condition to check if lookup field exists and get the value from the rawValue object by string index of lookup field key
                            if (!isNullOrEmptyString(lookupField) && !isNullOrUndefined(value[lookupField])) {
                                item.FieldValuesAsText[DecodeFieldValuesAsTextKey(fieldInternalName)] = value[lookupField];
                            } else {
                                item.FieldValuesAsText[DecodeFieldValuesAsTextKey(fieldInternalName)] = value.Title;
                            }
                        }
                    }
                });
        } catch (e) {
            logger.error(`Failed to fix list item result ${item && item.Id || 'unknown id'}`);
        }
    });

    //loop through items, put them inside folders
    let itemsInRoot: IRestItem[] = [];
    items.forEach(item => {
        let parentFolder = folders[item.FileDirRef.toLowerCase()];
        if (!isNullOrUndefined(parentFolder)) {

            if (item.FileSystemObjectType === FileSystemObjectTypes.Folder) {
                //add it before any items, so we have folders first (sorted) and items after
                let indexOfLastFolder = lastIndexOf(parentFolder.__Items, i => i.FileSystemObjectType === FileSystemObjectTypes.Folder);
                parentFolder.__Items.splice(indexOfLastFolder + 1, 0, item);
            } else
                parentFolder.__Items.push(item);
            item.__ParentFolder = parentFolder;
        }
        else itemsInRoot.push(item);
    });

    switch (foldersBehaviour) {
        case GeListItemsFoldersBehaviour.AllItemsNoFolders:
            return items.filter(r => r.FileSystemObjectType !== 1);
        case GeListItemsFoldersBehaviour.ItemsInsideFolders:
            return itemsInRoot;
        case GeListItemsFoldersBehaviour.ItemsAndFoldersFlat:
        default:
            return items;
    }
}

export var SkipFields: string[] = [
    "appauthor",
    "appeditor",
    "linktitle",
    "linktitlenomenu",
    "linkfilename",
    "linkfilenamenomenu",
    "_copysource",
    "_complianceflags",
    "_compliancetag",
    "_compliancetagwrittentime",
    "_compliancetaguserid",
    "_isrecord",
    //issue 5576: allow user to see version column "_uiversionstring",
    "itemchildcount",
    "folderchildcount",
    "complianceassetid",
    "xd_progid",
    "xd_signature",
    "_shortcuturl",
    "_shortcutsiteid",
    "_shortcutwebid",
    "_shortcutuniqueid",
    "_hascopydestinations",
    "sortbehavior",
    "permmask",
    "syncclientid",
    "progid",
    "scopeid",
    "virusstatus",
    "_editmenutablestart",
    "_editmenutablestart2",
    "_editmenutableend",
    "linkfilename2",
    "basename",
    "metainfo",
    "_level",
    "_iscurrentversion",
    "originatorid",
    "noexecute",
    "bsn",
    "_listschemaversion",
    "_dirty",
    "_parsable",
    "_stubfile",
    "_virusstatus",
    "_virusvendorid",
    "_virusinfo",
    "_rmstemplateid",
    "_iplabelid",
    "_displayname",
    "smtotalsize",
    "smlastmodifieddate",
    "smtotalfilestreamsize",
    "smtotalfilecount",
    "selecttitle",
    "selectfilename",
    "edit",
    "workflowversion",
    "workflowinstanceid",
    "parentversionstring",
    "parentleafname",
    "docconcurrencynumber",
    "parentuniqueid",
    "streamhash",
    "combine",
    "repairdocument"];


/** 
 * version #.# or version ID as number
 * version: 1.5 >> version ID for history
 * */
export function SPVersionToVersionId(version: string | number) {
    try {
        if (isNumber(version)) return version;
        const vSplit = version.split('.');
        const major = parseInt(vSplit[0], 10);
        const minor = parseInt(vSplit[1], 10);
        let versionId = (major * 512) + minor;
        return versionId;
    }
    catch (e) { }
    return null;
}
