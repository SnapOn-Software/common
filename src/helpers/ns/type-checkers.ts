import { insAccessToken, insTokenInfo, tnsContext, tnsRecordContext } from "../../types/ns/ns.ctx.types";
import { insSuiteTalkRestErrorData } from "../../types/ns/ns.types";
import { isNotEmptyArray, isNotEmptyString, isNumber } from "../typecheckers";

export function isnsSuiteTalkRestErrorData(error: unknown): error is insSuiteTalkRestErrorData {
    const as = error as insSuiteTalkRestErrorData;
    return isNumber(as?.status) && isNotEmptyArray(as?.["o:errorDetails"]);
}
export function isnsContext(info: unknown): info is tnsContext {
    const as = info as tnsContext;
    return isNotEmptyString(as?.accountId);
}
export function isnsAccessToken(info: unknown): info is insAccessToken {
    const as = info as insAccessToken;
    return isnsContext(as) && isNotEmptyString(as.accessToken);
}
export function isnsTokenInfo(info: unknown): info is insTokenInfo {
    const as = info as insTokenInfo;
    return isnsContext(as) && isNotEmptyString(as.tokenSecret);
}
export function isnsRecordContext(info: unknown): info is tnsRecordContext {
    const as = info as tnsRecordContext;
    return isNotEmptyString(as?.record);
}