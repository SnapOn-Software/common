import { IDictionary } from "../types/common.types";
import { filterEmptyEntries, makeUniqueArray } from "./collections.base";
import { isNullOrEmptyString, isNullOrUndefined, isNumber, isString } from "./typecheckers";

export function endsWith(str: string, value: string, ignoreCase?: boolean): boolean {
    let str1 = str;
    let find = value;
    if (ignoreCase) {
        str1 = str1.toLowerCase();
        find = find.toLowerCase();
    }

    return str1.substr(str1.length - find.length) === find;
}

export function startsWith(str: string, value: string, ignoreCase?: boolean): boolean {
    let str1 = str;
    let find = value;
    if (ignoreCase) {
        str1 = str1.toLowerCase();
        find = find.toLowerCase();
    }
    return str1.substr(0, find.length) === find;
}

/** remove space at start or end */
export function trim(str: string): string {
    return str.replace(/^\s+|\s+$/g, '');
}

export function trimEnd(str: string): string {
    return str.replace(/\s+$/, "");
}

export function trimStart(str: string): string {
    return str.replace(/^\s+/, "");
}

export function splice(str: string, start: number, delCount: number, insert: string) {
    return str.slice(0, start) + insert + str.slice(start + Math.abs(delCount));
}

export function padRight(value: string | number, length: number, fillString: string = "0") {
    if (isNumber(value))
        value = value.toString(10);
    let pad = isNullOrEmptyString(fillString) ? "0" : fillString[0];
    return value + Array(length - value.length + 1).join(pad);
}

export function padLeft(value: string | number, length: number, fillString: string = "0") {
    if (isNumber(value))
        value = value.toString(10);
    let pad = isNullOrEmptyString(fillString) ? "0" : fillString[0];
    return Array(length - String(value).length + 1).join(pad) + value;
}

/** returns array of [token] found inside the string 
 * supports token formats [Author??Created by {0}::Unknown author] will return "Author" as the token
 * */
export function GetTokens(StringFormat: string): string[] {
    let tokensResult: string[] = [];
    if (isNullOrEmptyString(StringFormat)) return tokensResult;

    let tokens = StringFormat.match(/\[[^\]]*\]/g);
    if (tokens && tokens.length > 0) {
        tokens.forEach(token => {
            let key = token.slice(1, token.length - 1);
            key = GetTokenInfo(key).tokenName;
            if (tokensResult.indexOf(key) < 0)
                tokensResult.push(key);
        });
    }

    return tokensResult;
}

/** replaces a string with [token] and [otherToken] with their matched provided values
 * supports token formats [Author??Created by {0}::Unknown author]
 */
export function ReplaceTokens(StringFormat: string, TokenValues: IDictionary<string>, options?: {
    /**set to true if you want to keep "[token]" in the string when a token value wasn't provided */
    keepMissingTokens?: boolean;
}): string {

    let skipMissingTokens = options && options.keepMissingTokens;

    if (isNullOrUndefined(StringFormat)) return null;
    if (StringFormat !== '') {
        let tokens = StringFormat.match(/\[[^\]]*\]/g);
        if (tokens && tokens.length > 0) {
            if (isNullOrUndefined(TokenValues)) TokenValues = {};

            tokens.forEach(token => {
                let key = token.slice(1, token.length - 1);
                let tokenInfo = GetTokenInfo(key);
                let value = TokenValues[tokenInfo.tokenName];
                let skip = false;
                if (isNullOrUndefined(value)) {
                    value = "";
                    skip = skipMissingTokens;//if true we won't replace this one
                }
                if (!skip || tokenInfo.hasFormat)
                    StringFormat = StringFormat.replace(token, tokenInfo.getValue(value));
            });
        }
    }
    return StringFormat;
}

/** calls replace tokens on every dictionary value, or set null keys to "". This function ignores null/empty dictionaries */
export function ReplaceTokensInDictionary(Dictionary: IDictionary<string>, TokenValues: IDictionary<string>) {
    if (!isNullOrUndefined(Dictionary)) {
        Object.keys(Dictionary).forEach(key => {
            Dictionary[key] = isNullOrEmptyString(Dictionary[key]) ? "" : ReplaceTokens(Dictionary[key], TokenValues);
        });
    }
}

/** Normalizes a guid string, lower case and removes {} */
export function normalizeGuid(text: string, removeDashes?: boolean): string {
    if (isNullOrEmptyString(text) || !isString(text)) {
        return text;
    }
    var guid = text.toLowerCase().trim();

    if (guid.startsWith("{")) {
        guid = guid.substr(1);
    }

    if (guid.endsWith("}")) {
        guid = guid.substr(0, guid.length - 1);
    }

    if (removeDashes) {
        guid = guid.replace(/-/g, '');
    }

    return guid;
}

export function isEmptyGuid(guid: { toString(): string; }) {
    if (isNullOrEmptyString(guid)) return true;
    else if (Number(normalizeGuid(guid.toString(), true)) === 0) return true;
    return false;
}

export function escapeRegExp(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function isValidDomainLogin(login: string) {
    return /^[A-Za-z0-9\\._-]{7,}$/.test(login);
}

export function stripRichTextWhitespace(value: string) {
    // richText fields in have random markup even when field is empty
    // \u200B zero width space
    // \u200C zero width non-joiner Unicode code point
    // \u200D zero width joiner Unicode code point
    // \uFEFF zero width no-break space Unicode code point       
    return isString(value) ? value.replace(/[\u200B-\u200D\uFEFF]/g, "") : value;
}

/** allows min length 1, letters, numbers underscore only */
export function isValidVarName(text: string) {
    return /^[A-Za-z0-9_]{1,}$/.test(text);
}

/** allows min length 1, letters, numbers underscore and hyphen only */
export function isValidHeaderName(text: string) {
    return /^[A-Za-z0-9_-]{1,}$/.test(text);
}

/** returns token info with format  */
export function GetTokenInfo(text: string) {
    let split = text.split('??');
    let hasFormat = split.length > 0 && !isNullOrEmptyString(split[1]);
    let formatSplit = hasFormat ? split[1].split('::') : [];
    let valueIfEmpty = formatSplit.length > 1 ? formatSplit[1] : "";
    let formatIfNotEmpty = formatSplit[0];
    let info = {
        tokenName: hasFormat ? split[0] : text,
        hasFormat: hasFormat,
        getValue: (value: string) => {
            if (!hasFormat) return value;
            else {
                if (isNullOrEmptyString(value)) return valueIfEmpty;
                else return formatIfNotEmpty.replace('{0}', value);
            }
        }
    };
    return info;
}

/** return true if both strings are the same, or both are empty/null/undefined */
export function stringEqualsOrEmpty(str1: string, str2: string, ignoreCase?: boolean) {
    if (isNullOrEmptyString(str1) && isNullOrEmptyString(str2)) return true;
    if (ignoreCase) {
        if (!isNullOrEmptyString(str1)) str1 = str1.toLowerCase();
        if (!isNullOrEmptyString(str2)) str2 = str2.toLowerCase();
    }

    return str1 === str2;
}

/** return true if str1 contains str2 */
export function stringContains(str1: string, str2: string, ignoreCase?: boolean) {
    if (isNullOrEmptyString(str1) && isNullOrEmptyString(str2)) return true;

    if (isNullOrEmptyString(str1))
        str1 = "";
    if (isNullOrEmptyString(str2))
        str2 = "";

    if (ignoreCase) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
    }

    return str1.indexOf(str2) >= 0;
}

export function cleanupString(str: string, options: {
    replaceNewLines?: string;
    collapseMultipleSpaces?: string;
    collapseMultipleDashes?: string;
    collapseMultipleUnderscore?: string;
}) {
    if (isString(options.replaceNewLines))
        str = str.replace(/\r/g, '')//no returns
            .replace(/\n/g, options.replaceNewLines);//no line breaks
    if (isString(options.collapseMultipleDashes))
        str = str.replace(/-+/g, options.collapseMultipleSpaces);//no extra spaces
    if (isString(options.collapseMultipleUnderscore))
        str = str.replace(/_+/g, options.collapseMultipleUnderscore);//no extra spaces

    // do this last, so it will collapse spaces added by previous options
    if (isString(options.collapseMultipleSpaces)) {
        str = str.replace(new RegExp(String.fromCharCode(160), "g"), '')//get rid of non-breaking spaces
            .replace(/ +/g, options.collapseMultipleSpaces);//no extra spaces
    }

    return str;
}

/** normalizes &#160; to &nbsp; see Issue 752 */
export function normalizeHtmlSpace(html: string) {
    if (isNullOrEmptyString(html)) return html;
    return html.replace(/&#160;/i, "&nbsp;");
}

export function replaceAll(str: string, find: string, replace: string, ignoreCase = false) {
    //must call escapeRegExp on find, to make sure it works when there are protected regex characters
    return str.replace(new RegExp(escapeRegExp(find), `g${ignoreCase ? 'i' : ''}`), replace);
}

export function capitalizeFirstLetter(str: string) {
    return isNullOrEmptyString(str)
        ? ""
        : `${str.charAt(0).toUpperCase()}${str.substring(1)}`;
}

export function escapeXml(unsafe: string, isAttribute = false) {
    if (isNullOrEmptyString(unsafe)) return "";
    return isAttribute
        ? unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
            return c;
        })
        : unsafe.replace(/[<>&]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
            }
            return c;
        });
}

/** uses regex str.match to replace each match by calling the replacer function (imported from CMS) */
export function replaceRegex(str: string, regex: RegExp, replacer: (match: string) => string | null) {
    let matches = str.match(regex);
    if (!matches || matches.length < 1) return str;
    //replace each found token only once
    let unique = makeUniqueArray(matches);
    //todo: this has a bug where tokens matched contain each other, example, match numbers and prefix with #: 10, 100 will match both and produce #10 ##100
    unique.forEach(m => {
        let replacement = replacer(m);
        if (!isNullOrUndefined(replacement))//ignore nulls
            str = replaceAll(str, m, replacement);
    });
    return str;
}

/** masks a long string, keeping X number for characters at the start/end and replacing the middle with the mask string (default: CC*****CCC) */
export function maskString(str: string, options?: {
    /** mask string, default ***** */
    mask?: string;
    /** characters to keep at start, default 2 */
    start?: number;
    /** characters to keep at end, default 2 */
    end?: number;
}) {
    const mask = options && options.mask || "*****";
    const start = options && isNumber(options.start) ? options.start : 2;
    const end = options && isNumber(options.end) ? options.end : 2;
    const prefix = start >= 0 ? str.slice(0, start) : str;
    const sliceEnd = str.length - end;
    const suffix = sliceEnd >= 0 ? str.slice(sliceEnd) : str;

    return `${prefix}${mask}${suffix}`;
}

export function splitString(str: string, options: { maxLength?: number; marker?: string | RegExp; clearEmptyEntries?: boolean }) {
    let strArr: string[] = [str];
    if (!isNullOrUndefined(options.marker)) strArr = str.split(options.marker);
    if (isNumber(options.maxLength) && options.maxLength > 0) {
        let splitted: string[] = [];
        strArr.forEach(currentStr => {
            while (currentStr.length > 0) {
                splitted.push(currentStr.slice(0, options.maxLength));
                currentStr = currentStr.slice(options.maxLength);
            }
        });

        strArr = splitted;
    }

    if (options.clearEmptyEntries)
        strArr = filterEmptyEntries(strArr);
    return strArr;
}

/**
 * Converts a camelCase, snake_case or PascalCase string into a Title Case string.
 * @param text - The camelCase string (e.g., "acctType")
 * @param capitalizeAll - If true, "Acct Type". If false, "Acct type".
 */
export function codeNameToTitle(text: string, capitalizeAll?: boolean): string {
    if (!text) return "";

    const words = text
        // 1. Handle camelCase: Insert space before capitals
        .replace(/([A-Z])/g, " $1")
        // 2. Handle snake_case: Replace underscores with spaces
        .replace(/_/g, " ")
        // 3. Clean up: Trim and split into words
        .trim()
        .split(/\s+/);

    return words
        .map((word, index) => {
            const lowerWord = word.toLowerCase();
            // Capitalize first word ALWAYS, capitalize others only if capitalizeAll is true
            if (index === 0 || capitalizeAll) {
                return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
            }
            return lowerWord;
        })
        .join(" ");
};
/** @deprecated use codeNameToTitle - keep here for intellisense*/
export const formatSnakeToTitle = codeNameToTitle;
/** @deprecated use codeNameToTitle - keep here for intellisense*/
export const formatCamelToTitle = codeNameToTitle;