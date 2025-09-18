import { CommonConfig } from "../config";

/** apps.kwizcom.com */
export const kwiz_cdn_hostname_production = "apps.kwizcom.com";
/** kwizappsfr.azurewebsites.net */
export const kwiz_cdn_hostname_fastring = "kwizappsfr.azurewebsites.net";
/** localhost:4433 */
export const kwiz_cdn_hostname_localdev = "localhost:4433";


/** https://apps.kwizcom.com (or local dev/fast-ring) - runtime use only, don't use in places where this might get saved in settings */
export const kwiz_cdn_root = `https://${CommonConfig.i.IsLocalDev
    ? kwiz_cdn_hostname_localdev
    : CommonConfig.i.IsFastRing
        ? kwiz_cdn_hostname_fastring
        : kwiz_cdn_hostname_production}`;