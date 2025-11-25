
export const KnownLocations = {
    us: "United States",
    eu: "Europe",
    au: "Australia",
    ca: "Canada"
}
export type KnownLocationsType = keyof typeof KnownLocations;
export const KnownLocationsNames = Object.keys(KnownLocations) as KnownLocationsType[];
/** gets a location, defaults to US if not found */
export function toKnownLocation(location?: string): KnownLocationsType {
    switch (location as KnownLocationsType) {
        case "eu":
        case "au":
        case "ca":
            return location as KnownLocationsType;
    }

    return "us";
}
/** check current user browser timezone settings and return his location */
export function getUserKnownLocation(): KnownLocationsType {
    const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
    if (timeZoneName.indexOf("europe/") >= 0) return "eu";
    if (timeZoneName.indexOf("us/") >= 0) return "us";
    if (timeZoneName.indexOf("canada/") >= 0) return "ca";
    if (timeZoneName.indexOf("australia/") >= 0) return "au";

    if (timeZoneName.indexOf("america/") >= 0) {
        //canada or us?
        if (timeZoneName.indexOf("/atikokan") >= 0 ||
            timeZoneName.indexOf("/blanc-Sablon") >= 0 ||
            timeZoneName.indexOf("/cambridge_bay") >= 0 ||
            timeZoneName.indexOf("/coral_harbour") >= 0 ||
            timeZoneName.indexOf("/creston") >= 0 ||
            timeZoneName.indexOf("/dawson") >= 0 ||
            timeZoneName.indexOf("/dawson_creek") >= 0 ||
            timeZoneName.indexOf("/edmonton") >= 0 ||
            timeZoneName.indexOf("/fort_nelson") >= 0 ||
            timeZoneName.indexOf("/glace_bay") >= 0 ||
            timeZoneName.indexOf("/goose_bay") >= 0 ||
            timeZoneName.indexOf("/halifax") >= 0 ||
            timeZoneName.indexOf("/inuvik") >= 0 ||
            timeZoneName.indexOf("/iqaluit") >= 0 ||
            timeZoneName.indexOf("/montreal") >= 0 ||
            timeZoneName.indexOf("/nipigon") >= 0 ||
            timeZoneName.indexOf("/pangnirtung") >= 0 ||
            timeZoneName.indexOf("/rainy_river") >= 0 ||
            timeZoneName.indexOf("/rankin_inlet") >= 0 ||
            timeZoneName.indexOf("/regina") >= 0 ||
            timeZoneName.indexOf("/resolute") >= 0 ||
            timeZoneName.indexOf("/st_johns") >= 0 ||
            timeZoneName.indexOf("/swift_current") >= 0 ||
            timeZoneName.indexOf("/thunder_bay") >= 0 ||
            timeZoneName.indexOf("/toronto") >= 0 ||
            timeZoneName.indexOf("/vancouver") >= 0 ||
            timeZoneName.indexOf("/whitehorse") >= 0 ||
            timeZoneName.indexOf("/winnipeg") >= 0 ||
            timeZoneName.indexOf("/yellowknife") >= 0
        )
            return "ca";
    }

    return "us";
}