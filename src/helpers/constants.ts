import { configInfo } from "../_dependencies";

/** apps.kwizcom.com */
export const kwiz_cdn_hostname_production = "apps.kwizcom.com";
/** kwizappsfr.azurewebsites.net */
export const kwiz_cdn_hostname_fastring = "kwizappsfr.azurewebsites.net";
/** localhost:4433 */
export const kwiz_cdn_hostname_localdev = "apps.kwizcom.com";


/** https://apps.kwizcom.com (or local dev/fast-ring) - runtime use only, don't use in places where this might get saved in settings */
export function kwiz_cdn_root() {
    //must wrap in function otherwise this will eval once before configInfo has been updated.
    return `https://${configInfo.IsLocalDev
        ? kwiz_cdn_hostname_localdev
        : configInfo.IsFastRing
            ? kwiz_cdn_hostname_fastring
            : kwiz_cdn_hostname_production}`;
}