import { isNullOrEmptyString } from "./typecheckers";

/** codes will match strings.common.validation_invalid context value */
export type tValidationErrorCode =
    | "fname_empty"
    | "fname_trim"
    | "fname_dots"
    | "fname_ending"
    | "fname_invalid_control"
    | "fname_invalid"
    | "fname_reserved"
    | "fname_vti"
    | "fldname_tilde"
    | "flname_tilde";
export type tValidationResult = { valid: false; error: string; error_code: tValidationErrorCode; } | { valid: true };
export type tValidationPlatform = "m365" | "sf" | "ns" | "local" | "all";

function _getIllegalCharsRegex(platform: tValidationPlatform): RegExp {
    switch (platform) {
        case "m365":
            return /["#%&*:<>?/\\{|}]/;
        case "sf":
        case "ns":
        case "local":
        case "all":
        default:
            return /[<>:"/\\|?*]/;
    }
}

function _validateNameExplicit(name: string, label: "File" | "Folder", platform: tValidationPlatform): tValidationResult {
    if (isNullOrEmptyString(name?.trim())) return { valid: false, error_code: "fname_empty", error: `${label} name cannot be empty` };
    if (name !== name.trim()) return { valid: false, error_code: "fname_trim", error: `${label} name cannot start or end with spaces` };
    if (name === "." || name === "..") return { valid: false, error_code: "fname_dots", error: `${label} name cannot be . or ..` };
    if (/[. ]$/.test(name)) return { valid: false, error_code: "fname_ending", error: `${label} name cannot end with a period or space` };
    if (/[\u0000-\u001f]/.test(name)) return { valid: false, error_code: "fname_invalid_control", error: `${label} name contains invalid control characters` };
    if (_getIllegalCharsRegex(platform).test(name)) return { valid: false, error_code: "fname_invalid", error: `${label} name contains invalid characters` };
    return { valid: true };
}

function _validateReservedNames(name: string, label: "File" | "Folder", platform: tValidationPlatform): tValidationResult {
    const nameToCheck = label === "File" ? name.split(".").slice(0, -1).join(".") || name : name;

    if (platform === "local" || platform === "m365") {
        if (/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i.test(nameToCheck)) {
            return { valid: false, error_code: "fname_reserved", error: `${label} name uses a reserved name` };
        }
    }

    if (platform === "m365") {
        if (/^\.lock$/i.test(nameToCheck) || /^desktop\.ini$/i.test(name)) {
            return { valid: false, error_code: "fname_reserved", error: `${label} name uses a reserved name` };
        }
        if (/_vti_/i.test(name)) {
            return { valid: false, error_code: "fname_vti", error: `${label} name cannot contain _vti_` };
        }
    }

    return { valid: true };
}

function _validateFoldernameExplicitByPlatform(folderName: string, platform: Exclude<tValidationPlatform, "all">): tValidationResult {
    const baseValidation = _validateNameExplicit(folderName, "Folder", platform);
    if (!baseValidation.valid) return baseValidation;

    const reservedValidation = _validateReservedNames(folderName, "Folder", platform);
    if (!reservedValidation.valid) return reservedValidation;

    if (platform === "m365" && /^~/.test(folderName)) return { valid: false, error_code: "fldname_tilde", error: "Folder name cannot start with ~" };
    return { valid: true };
}

function _validateFilenameExplicitByPlatform(fileName: string, platform: Exclude<tValidationPlatform, "all">): tValidationResult {
    const baseValidation = _validateNameExplicit(fileName, "File", platform);
    if (!baseValidation.valid) return baseValidation;

    const reservedValidation = _validateReservedNames(fileName, "File", platform);
    if (!reservedValidation.valid) return reservedValidation;

    if (platform === "m365" && /^~\$/.test(fileName)) return { valid: false, error_code: "flname_tilde", error: "File name cannot start with ~$" };
    return { valid: true };
}

export function validateFoldernameExplicit(folderName: string, platform: tValidationPlatform = "all"): tValidationResult {
    if (platform === "all") {
        const platforms: Array<Exclude<tValidationPlatform, "all">> = ["local", "m365", "sf", "ns"];
        for (const currentPlatform of platforms) {
            const result = _validateFoldernameExplicitByPlatform(folderName, currentPlatform);
            if (!result.valid) return result;
        }
        return { valid: true };
    }

    return _validateFoldernameExplicitByPlatform(folderName, platform);
}

export function validateFilenameExplicit(fileName: string, platform: tValidationPlatform = "all"): tValidationResult {
    if (platform === "all") {
        const platforms: Array<Exclude<tValidationPlatform, "all">> = ["local", "m365", "sf", "ns"];
        for (const currentPlatform of platforms) {
            const result = _validateFilenameExplicitByPlatform(fileName, currentPlatform);
            if (!result.valid) return result;
        }
        return { valid: true };
    }

    return _validateFilenameExplicitByPlatform(fileName, platform);
}