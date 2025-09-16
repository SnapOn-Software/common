import { configInfo } from "../../../_dependencies";
import { chunkArray, firstIndexOf, firstOrNull, makeUniqueArray, toHash } from "../../../helpers/collections.base";
import { EnsureViewFields, GetOrderByFromCaml, RemoveOrderByFromCaml, getFieldOutputType } from "../../../helpers/sharepoint";
import { isDate, isNotEmptyArray, isNullOrEmptyArray, isNullOrEmptyString, isNullOrNaN, isNullOrUndefined, isNumeric } from "../../../helpers/typecheckers";
import { encodeURIComponentEX } from "../../../helpers/url";
import { IDictionary } from "../../../types/common.types";
import { jsonTypes } from "../../../types/rest.types";
import { IFieldInfoEX } from "../../../types/sharepoint.types";
import { GeListItemsFoldersBehaviour, IRestItem } from "../../../types/sharepoint.utils.types";
import { ConsoleLogger } from "../../consolelogger";
import { GetJson } from "../../rest";
import { GetSiteUrl, __getSPRestErrorData } from "../common";
import { GetListFields, GetListRestUrl } from "../list";
import { SPServerLocalTimeToUTCSync } from "../web";
import { GetItemsById } from "./GetListItemsById";
import { SkipFields, __fixGetListItemsResults } from "./common";

const logger = ConsoleLogger.get("sharepoint.rest/list/GetListItemsByCaml");

interface ICamlOptions {
    /** Optional, default: 1000. 0: get all items. */
    rowLimit?: number;
    /** Id, Title, Modified, FileLeafRef, FileDirRef, FileRef, FileSystemObjectType */
    columns: string[];
    foldersBehaviour?: GeListItemsFoldersBehaviour;
    /** set query to get items from this folder only */
    FolderServerRelativeUrl?: string;
    refreshCache?: boolean;
}

//Lookup threshold limit is 12 but we use a smaller number here to ensure there are no issues
const lookupOrUserFieldLimit = 11;
/** returns the items or NULL, never errors out since it is used in aggregator.
 *  set throwErrors = true if you want errors to be thrown instead of returning null.
 * camlQuery: one of:
 *  - view.ViewQuery
 *  - wrapped view.ViewQuery in a <View>: "&lt;View Scope='RecursiveAll'>&lt;Query>&lt;/Query>&lt;RowLimit>1000&lt;/RowLimit>&lt;/View>" or send rowLimit in options.
 */
export async function GetListItemsByCaml(siteUrl: string, listIdOrTitle: string, camlQuery: string, options: ICamlOptions): Promise<IRestItem[]> {
    siteUrl = GetSiteUrl(siteUrl);

    if (!camlQuery.toLowerCase().startsWith("<view")) {
        camlQuery = `<View Scope='RecursiveAll'><Query>${camlQuery}</Query></View>`;
    }

    let xmlParser = new DOMParser();
    let xmlDoc = xmlParser.parseFromString(camlQuery, "text/xml");
    let viewNode = xmlDoc.querySelector("View, view");
    let queryNode = viewNode && viewNode.querySelector("Query, query");
    let rowLimitNode = viewNode && viewNode.querySelector("RowLimit, rowlimit");
    let viewFieldsNode = viewNode && viewNode.querySelector("ViewFields, viewfields");

    let parseRowLimitNodeResult = _parseRowLimitNode(rowLimitNode, viewNode, options.rowLimit);
    if (!isNullOrUndefined(parseRowLimitNodeResult)) {
        options.rowLimit = parseRowLimitNodeResult.rowLimit;
        camlQuery = parseRowLimitNodeResult.camlQuery;
    }

    let removeSingleAndConditionsResult = _removeSingleAndConditions(viewNode, queryNode);
    if (!isNullOrUndefined(removeSingleAndConditionsResult)) {
        camlQuery = removeSingleAndConditionsResult.camlQuery;
    }

    let getAllItems = isNullOrEmptyString(options.rowLimit) || options.rowLimit < 1;
    let totalItemsInList = 99999;

    let maxBatchSize = 5000;
    let batchSize = options.rowLimit > 0 && options.rowLimit < maxBatchSize ? options.rowLimit : maxBatchSize;
    let totalNumberOfItemsToGet = getAllItems ? totalItemsInList : options.rowLimit > maxBatchSize ? options.rowLimit : batchSize;

    let requestUrl = `${GetListRestUrl(siteUrl, listIdOrTitle)}/GetItems?$expand=FieldValuesAsText`;

    let allListFieldsHash = toHash(await GetListFields(siteUrl, listIdOrTitle), f => f.InternalName);

    let expandFields: string[] = [];

    let orderByStatement = GetOrderByFromCaml(camlQuery);

    if (isNullOrUndefined(options.columns)) {
        options.columns = [];
    }

    let columns = options.columns;
    columns = _ensureOrderByColumns(orderByStatement, columns);
    columns = _ensureViewFields(viewFieldsNode, columns, allListFieldsHash);
    columns = _normalizeColumns(columns, allListFieldsHash);

    if (columns.length > options.columns.length) {
        logger.warn(`added ${columns.length - options.columns.length} to query`);
    }

    options.columns = columns;

    // Store the result of processing the request
    let rtrnProcessRequestResult: { items: IRestItem[]; postProcessOrderBy: boolean; needContentTypes: boolean };

    let lookupOrUserFieldsInColumns = options.columns.filter((columnName) => {
        let field = allListFieldsHash[columnName];
        return _isLookupOrUserField(field);
    });

    let isThrottled = lookupOrUserFieldsInColumns.length >= lookupOrUserFieldLimit;

    try {
        if (isThrottled) {
            //ISSUE: 1565
            rtrnProcessRequestResult = await _processLookupThresholdCamlRequest(
                orderByStatement,
                allListFieldsHash,
                options,
                camlQuery,
                requestUrl,
                expandFields,
                siteUrl,
                totalNumberOfItemsToGet,
                batchSize);
        } else {
            rtrnProcessRequestResult = await _processNormalCamlRequest(
                orderByStatement,
                allListFieldsHash,
                options,
                camlQuery,
                requestUrl,
                expandFields,
                siteUrl,
                totalNumberOfItemsToGet,
                batchSize);
        }

        const { items, needContentTypes, postProcessOrderBy } = rtrnProcessRequestResult

        let itemsResult = __fixGetListItemsResults(siteUrl, listIdOrTitle, items, options.foldersBehaviour);

        let itemsWithOutContentType: number[] = [];
        if (needContentTypes) {
            itemsResult.forEach((item) => {
                if (isNullOrUndefined(item["ContentType"])) {
                    itemsWithOutContentType.push(item.Id);
                } else if (!isNullOrUndefined(item["ContentType"].Name)) {
                    item["ContentType"] = item["ContentType"].Name;
                }
            });
        }

        if (itemsWithOutContentType.length > 0) {
            logger.time("Getting content types");
            //Issue 1465 content types no longer come back from get items request...
            //Make a separate request to get this info
            let ctypes = (await GetItemsById(siteUrl, listIdOrTitle, itemsWithOutContentType, {
                expand: ['ContentType/Name'],
                select: ['ContentType/Name', 'Id'],
                jsonMetadata: jsonTypes.nometadata
            })) as any as { Id: string, ContentType: { Name: string } }[];

            itemsResult.forEach(item => {
                if (!isNullOrUndefined(ctypes[item.Id])) {
                    item["ContentType"] = ctypes[item.Id].ContentType.Name
                }
            });
            logger.timeEnd("Getting content types");
        }

        if (postProcessOrderBy) {
            //re-apply sort
            if (configInfo.IsLocalDev) {
                logger.table(itemsResult.map(i => {
                    let row = {
                        Id: i.Id,
                        Title: i.Title
                    };
                    orderByStatement.forEach(s => { row[`${s.Name} ${s.IsAscending ? 'asc' : 'desc'}`] = i[s.Name]; });
                    return row;
                }), "before sort", true);
            }
            itemsResult.sort((a, b) => {
                for (let i = 0; i < orderByStatement.length; i++) {
                    let ob = orderByStatement[i];
                    let v1 = a[ob.Name];
                    let v2 = b[ob.Name];
                    if (v1 === v2) {
                        //these are equal - continue to second sort statement
                    }
                    else {
                        if (ob.IsAscending)
                            return (v1 > v2) ? 1 : -1;
                        else
                            return (v2 > v1) ? 1 : -1;
                    }
                }
                return 0;
            });

            if (configInfo.IsLocalDev) {
                logger.table(itemsResult.map(i => {
                    let row = {
                        Id: i.Id,
                        Title: i.Title
                    };
                    orderByStatement.forEach(s => { row[`${s.Name} ${s.IsAscending ? 'asc' : 'desc'}`] = i[s.Name]; });
                    return row;
                }), "after sort", true);
            }

        }

        return itemsResult;
    } catch (ex) {
        console.log(`isThrottled: ${isThrottled}`);
    }

    return null;
}

// (window as any).runtTest = true;
// window.setTimeout(() => {
//     if ((window as any).runtTest == false) return;
//     (window as any).runtTest = false;
//     GetListItemsByCaml(null, "aec7756b-daa0-4da1-88ba-c66cb572e816", "", {
//         columns: [],
//         refreshCache: true
//     }).then((r) => {

//     });
// }, 500);

//ISSUE: 1565
async function _processLookupThresholdCamlRequest(
    orderByStatement: { Name: string; IsAscending: boolean; }[],
    allListFieldsHash: IDictionary<IFieldInfoEX>,
    options: ICamlOptions,
    camlQuery: string,
    requestUrl: string,
    expandFields: string[],
    siteUrl: string,
    totalNumberOfItemsToGet: number,
    batchSize: number) {
    let rtrnProcessRequestResult = {
        items: [],
        postProcessOrderBy: false,
        needContentTypes: false
    };

    let orderByFields = orderByStatement.map((orderByField) => {
        let field = allListFieldsHash[orderByField.Name];
        return field;
    });

    let lookupOrUserFieldsInOrderBy = orderByFields.filter((orderByField) => {
        return _isLookupOrUserField(orderByField);
    });

    let lookupOrUserFieldsToChunk = options.columns.filter((columnName) => {
        let field = allListFieldsHash[columnName];
        if (_isLookupOrUserField(field)) {
            let col = firstOrNull(lookupOrUserFieldsInOrderBy, (orderByField) => {
                return field.InternalName !== orderByField.InternalName;
            });

            return col === null;
        }
        return false;
    });

    let otherFieldNames = options.columns.filter((columnName) => {
        let field = allListFieldsHash[columnName];
        return !isNullOrUndefined(field) && !_isLookupOrUserField(field);
    });

    //The number of lookup columns in each request is based on the lookupOrUserFieldLimit.     
    //Lookup fields in the order by statement must be sent with each request.
    //For example, we have 20 lookup columns and 3 of them are in the order by statement.
    //The 3 order by lookup columns are sent with each request. The remaining lookups are split into chunks.    
    //The request will split into 3 requests
    //The first request will have 11 lookup columns (8 standard + 3 order by lookup columns)
    //The second request will have 11 lookup columns (8 standard + 3 order by lookup columns)
    //The third request will have 4 lookup columns (1 standard + 3 order by lookup columns)
    let requestChunks = chunkArray(lookupOrUserFieldsToChunk, lookupOrUserFieldLimit - lookupOrUserFieldsInOrderBy.length);
    let otherFieldsChunkSize = Math.ceil(otherFieldNames.length / requestChunks.length);
    let otherFieldsChunks = chunkArray(otherFieldNames, otherFieldsChunkSize);

    requestChunks.forEach((chunk, index) => {
        //Add all order by fields to each request, this will include the lookup
        //fields from the order by statement that we left room for previously
        requestChunks[index] = chunk.concat(orderByFields.map((orderByField) => {
            return orderByField.InternalName;
        }));

        //Add the other fields but split them across the requests so we don't request duplicate data
        if (otherFieldsChunks[index]) {
            requestChunks[index] = chunk.concat(otherFieldsChunks[index]);
        }
    });

    //requestChunks should now have about the same number of fields in each chunk and each
    //chunk will have all the order by fields.            
    let queries = requestChunks.map((requestChunk) => {
        let camlQueryClone = camlQuery;

        let processColumnsResult = _processColumns(requestChunk, expandFields, allListFieldsHash);

        //Id field must be included in oder to merge the items correctly
        let viewFields = processColumnsResult.viewFields;
        if (viewFields.length && !viewFields.includes("Id")) {
            viewFields.push("Id");
        }

        let selectFields = processColumnsResult.selectFields
        if (selectFields.length && !selectFields.includes("Id")) {
            selectFields.push("Id");
        }

        rtrnProcessRequestResult.needContentTypes = rtrnProcessRequestResult.needContentTypes || processColumnsResult.needContentTypes;

        expandFields = processColumnsResult.expandFields;

        if (isNotEmptyArray(viewFields)) {
            camlQueryClone = EnsureViewFields(camlQueryClone, viewFields, true);
        }

        // if (isDebug()) {
        //     let lfields = viewFields.filter((fieldName) => {
        //         let field = allListFieldsHash[fieldName];
        //         return _isLookupOrUserField(field);
        //     });

        //     let xmlDoc = new DOMParser().parseFromString(camlQueryClone, "text/xml");
        //     let viewNode = xmlDoc.querySelector("View, view");
        //     let viewFieldsNode = viewNode && viewNode.querySelector("ViewFields, viewfields");

        //     let viewFields2 = Array.from(viewFieldsNode.children).map((viewFieldNode) => {
        //         let name = viewFieldNode.getAttribute("Name") || viewFieldNode.getAttribute("name");
        //         return name;
        //     });

        //     let lfields2 = viewFields2.filter((fieldName) => {
        //         let field = allListFieldsHash[fieldName];
        //         return _isLookupOrUserField(field);
        //     });

        //     if (lfields2.length !== lfields.length) {
        //         logger.warn("Lookup fields in caml query do not match look up fields in view fields.");
        //         logger.warn(`Lookup fields in caml query: ${lfields2}`)
        //         logger.warn(`Lookup fields in in view fields: ${lfields}`)
        //     }
        // }

        // Prepare the REST URL with select fields
        let restUrlWithSelect = requestUrl;
        if (expandFields.length > 0) {
            restUrlWithSelect += ',' + expandFields.join(',');
        }
        // Include the lookup user select fields with the other select fields
        restUrlWithSelect += '&$select=' + selectFields.join(',');
        return { camlQueryClone, restUrlWithSelect, viewFields };
    });

    let mergedItems: IRestItem[] = null;
    for (let i = 0; i < queries.length; i++) {
        const { camlQueryClone, restUrlWithSelect, viewFields } = queries[i];

        let loopResult = await processRequestResult(requestUrl,
            restUrlWithSelect,
            camlQueryClone,
            { ...options, columns: viewFields },
            siteUrl,
            totalNumberOfItemsToGet,
            batchSize,
            orderByStatement);

        if (isNullOrUndefined(mergedItems)) {
            mergedItems = loopResult.items;
        } else {
            for (let restItemIndex = 0; restItemIndex < loopResult.items.length; restItemIndex++) {
                //The item chunks (loopResult) should be in the same order as mergedItems because each request should have the 
                //same number of items returned in the same order. The only difference between requests is which fields are present.
                //So request 1 will have the 1st set of fields, request 2 will have the 2nd set. etc.
                //This means that the restItemIndex should be the same as existingItemIndex for each iteration. But, we do these extra 
                //checks just in case.
                let restItem = loopResult.items[restItemIndex];
                let existingItem = mergedItems[restItemIndex];
                let existingItemIndex = restItemIndex;
                if (isNullOrUndefined(existingItem) || existingItem.Id !== restItem.Id) {
                    existingItemIndex = firstIndexOf(mergedItems, (mergedItem) => {
                        return mergedItem.Id === restItem.Id;
                    });
                }

                if (existingItemIndex === -1) {
                    //We shouldn't get here. Each chunk should have the same items in the same order.
                    logger.warn("_processLookupThresholdCamlRequest results are out of sync");
                    mergedItems.push(restItem);
                } else {
                    let existingItem = mergedItems[existingItemIndex];
                    let FieldValuesAsText = {
                        ...(existingItem.FieldValuesAsText || {}),
                        ...(restItem.FieldValuesAsText || {})
                    };
                    let FieldValuesForEdit = {
                        ...(existingItem.FieldValuesForEdit || {}),
                        ...(restItem.FieldValuesForEdit || {})
                    };
                    existingItem = { ...existingItem, ...restItem };
                    existingItem.FieldValuesAsText = FieldValuesAsText;
                    existingItem.FieldValuesForEdit = FieldValuesForEdit;
                    mergedItems[existingItemIndex] = existingItem;
                }
            }
        }

        // only need to put this true if it happens once
        if (loopResult.postProcessOrderBy) {
            rtrnProcessRequestResult.postProcessOrderBy = true;
        }
    }

    rtrnProcessRequestResult.items = mergedItems;

    return rtrnProcessRequestResult;
}

async function _processNormalCamlRequest(orderByStatement: { Name: string; IsAscending: boolean; }[],
    allListFieldsHash: IDictionary<IFieldInfoEX>,
    options: ICamlOptions,
    camlQuery: string,
    requestUrl: string,
    expandFields: string[],
    siteUrl: string,
    totalNumberOfItemsToGet: number,
    batchSize: number) {
    let processColumnsResult = _processColumns(options.columns, expandFields, allListFieldsHash);
    let viewFields = processColumnsResult.viewFields;
    let selectFields = processColumnsResult.selectFields;
    expandFields = processColumnsResult.expandFields;
    let needContentTypes = processColumnsResult.needContentTypes;

    if (isNotEmptyArray(viewFields)) {
        camlQuery = EnsureViewFields(camlQuery, viewFields, true);
    }

    // Prepare the REST URL with select fields
    let restUrlWithSelect = requestUrl;
    if (expandFields.length > 0) {
        restUrlWithSelect += ',' + expandFields.join(',');
    }
    // Include the lookup user select fields with the other select fields
    restUrlWithSelect += '&$select=' + selectFields.join(',');

    // Process the request and get the result
    let result = await processRequestResult(requestUrl, restUrlWithSelect, camlQuery, options, siteUrl, totalNumberOfItemsToGet, batchSize, orderByStatement);

    return {
        ...result,
        needContentTypes
    };
}

function _ensureViewFields(viewFieldsNode: Element, columns: string[], allListFieldsHash: IDictionary<IFieldInfoEX>) {
    //ISSUE: 1565
    //Cases
    //1. Empty view fields element so ALL columns will be requested. We must include all list fields in 
    //columns parsing so that we get an accurate count of how many lookup/user fields there are
    //2. View fields element with a some field names that must also be included in the column parsing so we add them here.
    if (isNullOrUndefined(viewFieldsNode) && isNullOrEmptyArray(columns)) {
        Object.keys(allListFieldsHash).forEach((fieldName) => {
            let field = allListFieldsHash[fieldName];
            if (!isNullOrUndefined(field)
                && !field.Hidden
                && !SkipFields.includes(fieldName.toLowerCase())) {
                columns.push(field.InternalName);
            }
        });
    } else if (!isNullOrUndefined(viewFieldsNode)) {
        let fieldRefNodes = Array.from(viewFieldsNode.querySelectorAll("FieldRef"));
        if (isNotEmptyArray(fieldRefNodes)) {
            fieldRefNodes.forEach((fieldRefNode) => {
                let name = fieldRefNode.getAttribute("Name") || fieldRefNode.getAttribute("name");
                if (!isNullOrEmptyString(name)) {
                    columns.push(name);
                }
            });
        }
    }

    return columns;
}

function _ensureOrderByColumns(orderByStatement: { Name: string; IsAscending: boolean; }[], columns: string[]) {
    //Issue 548: Ensure that the order by field is in the view fields and columns collection so 
    //that paging works correctly when there is an order by clause    
    if (orderByStatement.length > 0 && !isNullOrEmptyString(orderByStatement[0].Name)) {
        // just add them to columns, and we will add them to view fields below.
        // camlQuery = EnsureViewFields(camlQuery, orderByStatement.orderBy.map(o => o.Name), false);       
        orderByStatement.forEach(o => {
            if (columns.indexOf(o.Name) === -1) {
                columns.push(o.Name);
            }
        });
    }

    return columns;
}

function _normalizeColumns(columns: string[], allListFieldsHash: IDictionary<IFieldInfoEX>) {
    return makeUniqueArray(columns.map((column) => {
        //some columns will come in lower case (from dvp), normalize them so that we can remove duplicates
        let name = Object.keys(allListFieldsHash).filter((fieldName) => {
            return fieldName.toLowerCase() === column.toLowerCase();
        })[0];
        if (!isNullOrEmptyString(name)) {
            let field = allListFieldsHash[name];
            return field;
        }
        return null;
    }).filter((field) => {
        return !isNullOrUndefined(field);
    }).map((field) => {
        return field.InternalName;
    }).concat(['Title', 'Id', 'FileLeafRef', 'FileDirRef', 'FileRef', 'FileSystemObjectType']));
}

function _removeSingleAndConditions(viewNode: Element, queryNode: Element) {
    if (!isNullOrUndefined(viewNode.querySelector("And, and"))) {
        try {
            //Issue 8063: calendar list, will wrongly add a wrapping <and> statement for a single condition
            //will result in error 500
            //ie: <View Scope='RecursiveAll'><Query><Where><And><Eq><FieldRef Name=\"Title\" /><Value Type=\"Text\">Holiday</Value></Eq></And></Where>
            //</Query><RowLimit>5000</RowLimit></View>
            let whereNode = queryNode && queryNode.querySelector("Where, where");

            if (!isNullOrUndefined(whereNode)) {
                let firstCondition = whereNode.firstElementChild;
                if (firstCondition.tagName.toLowerCase() === "and" && firstCondition.children.length < 2) {
                    //this is the bug, <and> tag must have 2 conditions - get rid of it!
                    whereNode.innerHTML = firstCondition.innerHTML;
                    return {
                        camlQuery: viewNode.outerHTML
                    };
                }
            }
        } catch (e) { }
    }

    return null;
}

function _parseRowLimitNode(rowLimitNode: Element, viewNode: Element, rowLimit: number) {
    if (!isNullOrUndefined(rowLimitNode)) {
        let value = rowLimitNode.textContent;
        //if not provided by options - use it
        if (isNullOrNaN(rowLimit) && isNumeric(value) && Number(value) > 0) {
            rowLimit = Number(value);
        }
        //remove it
        viewNode.removeChild(rowLimitNode);
        return {
            camlQuery: viewNode.outerHTML,
            rowLimit: rowLimit
        };
    }
    return null;
}

function _processColumns(columns: string[], expandFields: string[], allListFieldsHash: IDictionary<IFieldInfoEX>) {
    let thresholdLimitLookupCount = 0;
    let thresholdLimitLookupHit = false;
    let selectFields: string[] = [];
    let viewFields: string[] = [];
    let needContentTypes = false;

    //column parsing
    columns.forEach(viewField => {
        let viewFieldLower = viewField.toLowerCase();
        if (viewFieldLower === 'contenttype' || viewFieldLower === 'contenttypeid') {
            needContentTypes = true;
        } else if (viewFieldLower === '_moderationstatus') {
            selectFields.push(`FieldValuesAsText/${viewField}`);
            viewFields.push('_moderationstatus');
        } else if (viewFieldLower === '_moderationcomments') {
            selectFields.push('OData_' + viewField);
            viewFields.push('_moderationcomments');
        } else if (viewFieldLower === "filesystemobjecttype") {
            selectFields.push("FileSystemObjectType");
        } else if (viewFieldLower === "fileref" || viewFieldLower === "filedirref") {
            //treat them similar to lookup fields
            selectFields.push(viewField);
            selectFields.push(`FieldValuesAsText/${viewField}`);
            viewFields.push(`${viewField}`);
            viewFields.push(`${viewField}Id`);
        } else {
            //prefer to get columns not from FieldValuesAsText, unless special data type requires it (date, lookup, boolean, etc...)
            //make the select url shorter
            let foundField = allListFieldsHash[viewField];
            if (foundField) {
                let foundFieldInternalName = foundField.InternalName;
                viewFields.push(foundFieldInternalName);

                let urlField: IFieldInfoEX = null;

                if (foundField.TypeAsString === "URL" && foundField.InternalName === "URL") {
                    urlField = foundField;
                } else if ((viewFieldLower === "urlnomenu"
                    || viewFieldLower === "urlwmenu2"
                    || viewFieldLower === "urlwmenu")
                    && foundField.TypeAsString === "Computed"
                    && !isNullOrUndefined(allListFieldsHash["URL"])
                    && allListFieldsHash["URL"].TypeAsString === "URL") {
                    urlField = allListFieldsHash["URL"];
                }

                if (!isNullOrUndefined(urlField) && urlField.TypeAsString === "URL") {
                    viewFields.push(urlField.InternalName);
                    selectFields.push(urlField.InternalName);
                    selectFields.push(`FieldValuesAsText/${urlField.InternalName}`);
                } else {
                    //Issue 828, 336
                    if (foundFieldInternalName.startsWith("_")) {
                        foundFieldInternalName = `OData_${foundFieldInternalName}`;
                    }

                    let outputType = getFieldOutputType(foundField);

                    switch (outputType) {
                        case "Lookup":
                        case "LookupMulti":
                        case "User":
                        case "UserMulti":
                            thresholdLimitLookupCount += 1;
                            if (thresholdLimitLookupCount >= lookupOrUserFieldLimit) {
                                thresholdLimitLookupHit = true;
                            }
                            //lookup raw values comes with Id appended
                            selectFields.push(`FieldValuesAsText/${foundFieldInternalName}`);
                            selectFields.push(`${foundFieldInternalName}Id`);
                            break;
                        case "Boolean":
                        case "Attachments":
                        case "AllDayEvent":
                        case "Recurrence":
                            selectFields.push(`FieldValuesAsText/${foundFieldInternalName}`);
                            selectFields.push(foundFieldInternalName);
                            break;
                        default:
                            selectFields.push(foundFieldInternalName);
                            break;
                    }
                }
            }
            else {
                selectFields.push(viewField);
            }
        }
    });

    if (needContentTypes) {
        expandFields.push("ContentType");
        selectFields.push("ContentType/Name");
        selectFields.push("ContentTypeId");
        viewFields.push("ContentTypeId");
    }

    return {
        thresholdLimitLookupHit,
        viewFields: makeUniqueArray(viewFields),
        selectFields: makeUniqueArray(selectFields),
        expandFields: makeUniqueArray(expandFields),
        needContentTypes
    };
}

function _isLookupOrUserField(field: IFieldInfoEX) {
    if (isNullOrUndefined(field)) {
        return false;
    }
    let outputType = getFieldOutputType(field);

    switch (outputType) {
        case "Lookup":
        case "LookupMulti":
        case "User":
        case "UserMulti":
            return true;
        default:
            return false;
    }
}

async function processRequestResult(requestUrl: string, restUrlWithSelect: string, camlQuery: string, options: ICamlOptions, siteUrl: string, totalNumberOfItemsToGet: number, batchSize: number, orderByStatement): Promise<{ items: IRestItem[]; postProcessOrderBy: boolean; }> {
    //issue 6150: if there are too many fields, url will be too long. just get all columns without adding a $select
    if (restUrlWithSelect.length < 2000)
        requestUrl = restUrlWithSelect;

    let query: any = { ViewXml: camlQuery.replace("</View>", `<RowLimit>${batchSize}</RowLimit></View>`) };

    if (!isNullOrEmptyString(options.FolderServerRelativeUrl))
        query.FolderServerRelativeUrl = options.FolderServerRelativeUrl;

    let data = { query: query };

    let items: IRestItem[] = [];
    //let triedWithoutViewFields = false;
    let postProcessOrderBy = false;
    do {
        try {
            let requestResult = await GetJson<{ value: IRestItem[]; }>(requestUrl, JSON.stringify(data),
                {
                    allowCache: options.refreshCache !== true,
                    postCacheKey: JSON.stringify(data.query),
                    jsonMetadata: jsonTypes.nometadata,
                    spWebUrl: siteUrl
                });
            if (requestResult && requestResult.value)
                items.push(...requestResult.value);

            let itemsLeftToGet = totalNumberOfItemsToGet - items.length;
            if (itemsLeftToGet > 0 &&//we need more items
                requestResult.value.length === batchSize//we might have more on server since we got the full batch size we asked for
            ) {
                let lastItem = items[items.length - 1];
                let lastItemId = lastItem.Id;
                let pagingInfoSort = "";
                //Issue 7542 need to add order by value to the paging info if it is in the query
                if (!postProcessOrderBy && orderByStatement && orderByStatement.length) {
                    let orderFieldName = orderByStatement[0].Name;
                    let orderFieldValue = lastItem[orderFieldName];

                    //if field is ID - do not do it.
                    if (orderFieldName.toLowerCase() !== "id" && !isNullOrUndefined(orderFieldValue)) {
                        //if value is date - we need it in ISO and in this format: yyyyMMdd HH:mm:ss
                        try {
                            //Numbers cast to date properly but they are not dates. ignore number values.
                            let orderFieldValueAsDate = isNumeric(orderFieldValue) ? null : new Date(orderFieldValue);
                            if (isDate(orderFieldValueAsDate)) {
                                try {
                                    //issue 7599 date only field on different time zone...
                                    orderFieldValue = SPServerLocalTimeToUTCSync(siteUrl, orderFieldValueAsDate).replace(/T/i, " ").replace(/Z/i, " ");
                                } catch (e) { }
                            }

                        } catch (e) { }
                        pagingInfoSort = `&p_${orderFieldName}=${encodeURIComponentEX(orderFieldValue)}`;
                    }
                }
                data.query.ListItemCollectionPosition = {
                    "PagingInfo": `Paged=TRUE${pagingInfoSort}&p_ID=${lastItemId}`
                };
                if (itemsLeftToGet < batchSize)//the last batch should be smaller, update the row limit
                    data.query.ViewXml = camlQuery.replace("</View>", `<RowLimit>${itemsLeftToGet}</RowLimit></View>`);
            }
            else
                data = null;
        } catch (e) {
            if (__getSPRestErrorData(e).code.indexOf('SPQueryThrottledException')) {
                //test again - on awaiting score view, this will work but will ONLY return the order by fields...
                // if (!triedWithoutViewFields) {
                //     //Our own issues list had too many lookup fields.
                //     logger.info("Query throttled, trying again without view fields... some fields might be missing from results.");
                //     triedWithoutViewFields = true;
                //     camlQuery = EnsureViewFields(camlQuery, orderByStatement.map(o => o.Name), false, true);
                //     data.query.ViewXml = camlQuery.replace("</View>", `<RowLimit>${batchSize}</RowLimit></View>`);
                // }
                // else
                if (!postProcessOrderBy && orderByStatement.length > 0) {
                    logger.warn("Query throttled, trying again without order by...");
                    postProcessOrderBy = true;
                    camlQuery = RemoveOrderByFromCaml(camlQuery);
                    camlQuery = EnsureViewFields(camlQuery, [], false, true);
                    data.query.ViewXml = camlQuery.replace("</View>", `<RowLimit>${batchSize}</RowLimit></View>`);
                }
                else throw e;//still throttled? might be due to filter query
            }
            else throw e;//different error
        }
    } while (!isNullOrEmptyString(data));
    return { items: items, postProcessOrderBy: postProcessOrderBy };
}