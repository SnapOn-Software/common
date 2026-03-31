import { nsCountiesByCode, tnsCountryCode, tnsFieldTypes } from "../../exports-index";
import { nsCountriesByEnum, tnsCountryEnum } from "../../types/ns/ns.countries.restlet";
import { insSuiteTalkRestErrorData, tnsField } from "../../types/ns/ns.rest.types";
import { firstOrNull } from "../collections.base";
import { isNotEmptyArray, isNotEmptyString, isNullOrEmptyString } from "../typecheckers";
import { isnsSuiteTalkRestErrorData } from "./type-checkers";

const nsEndpointHosts = {
    suitetalk: '.suitetalk.api.netsuite.com',
    restlets: '.restlets.api.netsuite.com',
    ui: '.app.netsuite.com'
};

export function getNSAccuntUrlPrefix(accountId: string) {
    return accountId.replace('_', '-').toLowerCase();
}
export function getNsHost(accountId: string, host: keyof typeof nsEndpointHosts) {
    return `https://${getNSAccuntUrlPrefix(accountId)}${nsEndpointHosts[host]}`;
}
export function getBundlePage(info: {
    /** bundle id */
    id: string;
    /** bundle org id */
    orgId: string;
    /** customer's account id */
    accountId: string;
    /** page type */
    type: "install" | "update";
}) {
    if (info.type === "update")
        return `${getNsHost(info.accountId, "ui")}/app/bundler/previewbundleupdate.nl?fromcompid=${info.orgId}&domain=PRODUCTION&id=${info.id}`;
    else
        return `${getNsHost(info.accountId, "ui")}/app/bundler/bundledetails.nl?sourcecompanyid=${info.orgId}&domain=PRODUCTION&config=F&id=${info.id}`;
}

/** send in either an AxiosError that has a response.data object, or just the data object itself. */
export function nsGetErrorDetails(error: any) {
    const data: insSuiteTalkRestErrorData = isnsSuiteTalkRestErrorData(error)
        ? error
        : isnsSuiteTalkRestErrorData(error?.response?.data)
            ? error.response.data
            : null;
    return data;
}

const ignoreSuffixIfDuplicate = ["WithHierarchy", "Copy", "Display"];
export function nsFieldEditableFilter(field: tnsField, allFields?: string[]) {
    if (isNullOrEmptyString(field.title)
        || field.readOnly
        || ['id', 'createdDate', 'lastModifiedDate', 'externalId', 'refName'].includes(field.name))
        return false;
    if (isNotEmptyArray(allFields)) {
        const ending = firstOrNull(ignoreSuffixIfDuplicate, suffix => field.name.endsWith(suffix));
        if (isNotEmptyString(ending) && allFields.includes(field.name.slice(0, -1 * ending.length)))//got the field without the ending
            return false;
    }
    return true;
}

export function nsObjectFilter(obj: string) {
    return isNotEmptyString(obj);
}
export function nsIsFeaturedObject(obj: string) {
    return ["account", "lead", "customer"].includes(obj);
}

/** returns the title of the country or empty string if none found */
export function NSCountryToText(country: tnsCountryCode | tnsCountryEnum): string {
    return nsCountiesByCode[country as tnsCountryCode]?.title
        || nsCountriesByEnum[country as tnsCountryEnum]?.title
        || "";
}

/** returns the code and enum of the best matching country or null if not found */
export function TextToNSCountry(country: string): ({ code: tnsCountryCode, enum: tnsCountryEnum } | null) {
    if (isNullOrEmptyString(country)) return null;

    let lowerWords = country.toLowerCase().split(" ");
    //try to find the best match, until we are left with one option
    let allOptions = Object.keys(nsCountiesByCode) as tnsCountryCode[];
    let validOptions: tnsCountryCode[] = allOptions;

    for (let i = 0; i < lowerWords.length && validOptions.length > 1; i++) {
        let word = lowerWords[i];
        let newOptions = validOptions.filter(o => nsCountiesByCode[o].title.toLowerCase().split(' ').includes(word));
        if (newOptions.length > 0)//not empty - use this list
            validOptions = newOptions;
    }

    //done my loop. if I have more than 1 option - pick the best one.
    if (validOptions.length === 0 || validOptions.length === allOptions.length) return null;//none found
    else if (validOptions.length === 1) return { code: validOptions[0], enum: nsCountiesByCode[validOptions[0]].enum };
    else {
        //if user typed "atlantis" and we have "republic of atlantis" and "atlantis", he would get "atlantis" unless he mentiones "republic" as well
        let option = validOptions[0];
        let optionTitleSplit = nsCountiesByCode[option].title.split(' ');
        validOptions.forEach(o => {
            const oTitleSplit = nsCountiesByCode[o].title.split(' ');
            if (oTitleSplit.length < optionTitleSplit.length) {
                option = o;
                optionTitleSplit = oTitleSplit;
            }
        });
        return { code: option, enum: nsCountiesByCode[option].enum };
    }
}


export function nsFormatDate(date: Date, fieldType: tnsFieldTypes): string {
    if (!date || isNaN(date.getTime())) return "";

    const pad = (n: number) => n.toString().padStart(2, '0');

    const yyyy = date.getUTCFullYear();
    const mm = pad(date.getUTCMonth() + 1);
    const dd = pad(date.getUTCDate());
    const hh = pad(date.getUTCHours());
    const min = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());

    switch (fieldType) {
        case 'date':
            // YYYY-MM-DD
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        case 'datetime':
        case 'datetimetz':
            // YYYY-MM-DDTHH:mm:ssZ
            // Note: .toISOString() includes milliseconds, which is usually fine, 
            // but this manual string ensures exact compliance.
            return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`;

        case 'time':
        case 'timeofday':
            // HH:mm:ss (NetSuite often accepts HH:mm for timeofday)
            return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

        case 'mmyydate':
            // MM/YYYY
            return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

        default:
            return date.toISOString();
    }
}