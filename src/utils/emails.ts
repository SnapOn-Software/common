import { kwiz_cdn_root } from "../helpers/constants";
import { isValidEmail } from "../helpers/emails";
import { GetJsonSync, longLocalCache } from "./rest";


/** returns true if a valid email that is from a known free email provider */
export function isFreeEmail(email: string) {
    if (isValidEmail(email)) {
        var freeEmailListData = GetJsonSync<string>(`${kwiz_cdn_root}/products/common/scripts/free-email-list.txt`, null, {
            ...longLocalCache,
            headers: {
                "content-type": "text/plain",
                "Accept": "*/*"
            }
        });
        var freeEmailList = freeEmailListData.success ? freeEmailListData.result.replace(/\r/g, '').split('\n') : [
            "gmail.com",
            "yaho.com",
            "live.com"
        ];

        if (freeEmailList.includes(email.split('@')[1].toLowerCase()))
            return true;
    }
    return false;
}