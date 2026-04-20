import { CommonConfig } from "../common-config";

/** apps.kwizcom.com */
export const kwiz_cdn_hostname_production = "apps.kwizcom.com";
/** kwizappsfr.azurewebsites.net */
export const kwiz_cdn_hostname_fastring = "kwizappsfr.azurewebsites.net";
/** localhost:4433 */
export const kwiz_cdn_hostname_localdev = "apps.kwizcom.com";

/** https://apps.kwizcom.com (or local dev/fast-ring) - runtime use only, don't use in places where this might get saved in settings
 * used to load resources directly from the environment with no need for a redirect tool
 * redirect tool still needed for entry-point package such as SPFx
 */
export function kwiz_cdn_root() {
    //must wrap in function otherwise this will eval once before configInfo has been updated.
    return `https://${CommonConfig.i.IsLocalDev
        ? kwiz_cdn_hostname_localdev
        : CommonConfig.i.IsFastRing
            ? kwiz_cdn_hostname_fastring
            : kwiz_cdn_hostname_production}`;
}