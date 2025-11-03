import { escapeRegExp } from "./strings";
import { isNullOrUndefined } from "./typecheckers";

//https://support.microsoft.com/en-gb/office/restrictions-and-limitations-in-onedrive-and-sharepoint-64883a5d-228e-48f5-b3d2-eb39e07630fa
//These names aren't allowed for files or folders: .lock, CON, PRN, AUX, NUL, COM0 - COM9, LPT0 - LPT9, _vti_, 
//desktop.ini, any filename starting with ~$. "_vti_" can't appear anywhere in a file name.

export const ImageFileTypes = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];
export const DocumentFileTypes = ["docx", "doc", "pdf", "txt", "rtf", "odt"];
export const VideoFileTypes = ["mp4", "mov", "wmv", "avi", "mkv", "flv", "webm"];
export const OfficeFileTypes = ["docx", "doc", "xlsx", "xls", "pptx", "ppt", "csv"];

function _getRegexCollection() {
    return {
        IllegalCharsRegex: new RegExp("[" + escapeRegExp(`"*:<>?/\\|`) + "]", "gi"),
        IllegalCharsExtraRegex: new RegExp("[" + escapeRegExp(`~"#%&*:<>?/\\|`) + "]", "gi"),
        IllegalNamesRegex: /^(\.lock|CON|PRN|AUX|NUL|COM\d|LPT\d|.*_VTI_.*|~\$.*)$/gi,
        IsDesktopIni: /^desktop\.ini$/gi
    };
}

export function validateFilename(fileNameWithExtension: string) {
    let filenameWithOutExtension = fileNameWithExtension;
    let split = filenameWithOutExtension.split(".");
    split.pop();
    filenameWithOutExtension = split.join(".");

    let regexCollection = _getRegexCollection();

    let hasIllegalCharacter = regexCollection.IllegalCharsRegex.test(filenameWithOutExtension);
    let hasIllegalName = regexCollection.IllegalNamesRegex.test(filenameWithOutExtension) || regexCollection.IsDesktopIni.test(fileNameWithExtension);

    return {
        hasIllegalCharacter,
        hasIllegalName,
        valid: !hasIllegalCharacter && !hasIllegalName
    };
}

export function validateFoldername(folderName: string) {
    let regexCollection = _getRegexCollection();

    let hasIllegalCharacter = regexCollection.IllegalCharsRegex.test(folderName);
    let hasIllegalName = regexCollection.IllegalNamesRegex.test(folderName) || regexCollection.IsDesktopIni.test(folderName);

    return {
        hasIllegalCharacter,
        hasIllegalName,
        valid: !hasIllegalCharacter && !hasIllegalName
    };
}

export function validateAndSetFilename(fileNameWithExtension: string) {
    let regexCollection = _getRegexCollection();

    let validateFilenameChk = validateFilename(fileNameWithExtension);
    if (!validateFilenameChk.valid || regexCollection.IllegalCharsExtraRegex.test(fileNameWithExtension)) {
        fileNameWithExtension =
            fileNameWithExtension.replace(regexCollection.IllegalCharsRegex, "")
                .replace(regexCollection.IllegalCharsExtraRegex, "")
                .replace(regexCollection.IllegalNamesRegex, "")
                .replace(regexCollection.IsDesktopIni, "");
    }
    return fileNameWithExtension;
}

export function getFileExtension(fileName: string, options?: {
    /** send to to return "" when fileName does not have an extension, otherwise it returns the fileName  */
    emptyIfMissing?: boolean;
}) {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot >= 0) return fileName.slice(lastDot + 1).toLowerCase();
    //no dot ? return empty, or fileName?
    return !isNullOrUndefined(options) && options.emptyIfMissing === true ? "" : fileName;
}