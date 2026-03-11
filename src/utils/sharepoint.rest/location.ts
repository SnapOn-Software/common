import { waitFor } from "../../helpers/browser";
import { isNullOrEmptyArray, isNullOrEmptyString, isNullOrUndefined, isTypeofFullNameUndefined } from "../../helpers/typecheckers";
import { SPFxAuthTokenType } from "../../types/auth";
import { IMeetingLocation, IMeetingLocationEntityType } from "../../types/location.types";
import { jsonTypes } from "../../types/rest.types";
import { GetSPFxClientAuthToken } from "../auth/common";
import { GetJson } from "../rest";
import { shortLocalCache } from "../rest.vars";

interface IMeetingLocationsQuery {
    QueryConstraint: {
        Query: string;
        Id?: string;
        ResolveAvailability?: boolean;
    };
    LocationProvider: 32 | 8;
    BingMarket?: string;
}

interface IMeetingLocationResult {
    LocationType: IMeetingLocationEntityType
    RelevanceHint: string;
    RelevanceScore: number;
    MeetingLocation: IMeetingLocation;
}

interface IMeetingLocationsResponse {
    MeetingLocations: IMeetingLocationResult[],
    EmptyLocationsHint: string;
}

async function _findMeetingLocations(options: { bingUri: string; query: string }) {
    if (isNullOrUndefined(options) || (isNullOrEmptyString(options.bingUri) && isNullOrEmptyString(options.query))) {
        return null;
    }

    let contextReady = await waitFor(() => {
        return !isTypeofFullNameUndefined("_spPageContextInfo");
    });

    if (!contextReady) {
        return null;
    }

    let authToken = await GetSPFxClientAuthToken(_spPageContextInfo.webServerRelativeUrl, SPFxAuthTokenType.Outlook);

    if (isNullOrEmptyString(authToken)) {
        return null;
    }

    const { query, bingUri } = options;

    let useBingUri = !isNullOrEmptyString(bingUri);

    let queryData: IMeetingLocationsQuery = {
        QueryConstraint: {
            Query: useBingUri === true ? "" : query,
            Id: useBingUri === true ? bingUri : undefined,
            ResolveAvailability: useBingUri === true ? false : undefined
        },
        LocationProvider: useBingUri ? 8 : 32,
        BingMarket: _spPageContextInfo.currentCultureName
    };

    let url = "https://outlook.office365.com/SchedulingB2/api/v1.0/me/findmeetinglocations";
    let result = await GetJson<IMeetingLocationsResponse>(
        url,
        JSON.stringify(queryData),
        {
            ...shortLocalCache,
            postCacheKey: `${queryData.BingMarket}|${queryData.LocationProvider}|${useBingUri ? queryData.QueryConstraint.Id : queryData.QueryConstraint.Query}`,
            includeDigestInPost: false,
            headers: {
                "Accept": jsonTypes.verbose,
                "Authorization": `Bearer ${authToken}`,
                "content-type": jsonTypes.verbose,
                "x-anchormailbox": _spPageContextInfo.userEmail.toLowerCase(),
                "x-findmeetinglocations-appname": "sharepoint",
                "x-findmeetinglocations-appscenario": "locationfield",
            }
        });

    if (!isNullOrUndefined(result) && !isNullOrEmptyArray(result.MeetingLocations)) {
        let value = result.MeetingLocations.map((loc) => {
            return loc.MeetingLocation;
        });
        return value;
    }

    return null;
}

/** 
 * Get meeting locations using outlook.office365.com/SchedulingB2/api/v1.0/me/findmeetinglocations
 * @param query The term to search for  
 * @returns An array of meeting locations (https://learn.microsoft.com/en-us/graph/api/resources/location?view=graph-rest-1.0) sorted by relevance score
 */
export async function FindMeetingLocations(query: string) {
    let results = await _findMeetingLocations({ query: query, bingUri: null });
    return !isNullOrEmptyArray(results) ? results : null;
}

/** 
 * Resolve meeting locations using outlook.office365.com/SchedulingB2/api/v1.0/me/findmeetinglocations
 * @param bingUri The LocationUri for the meeting location
 * @returns A single meeting location
 */
export async function ResolveLocationFromBingUri(bingUri: string) {
    let results = await _findMeetingLocations({ query: null, bingUri: bingUri });
    return !isNullOrEmptyArray(results) ? results[0] : null;
}

//example response
//{
//     "MeetingLocations":
//         [{
//             "MeetingLocation":
//             {
//                 "EntityType": "LocalBusiness",
//                 "LocationSource": "Bing",
//                 "LocationUri":
//                     "https://www.bingapis.com/api/v6/localbusinesses/YN1226x25906078?setLang=en-CA",
//                 "UniqueId": "https://www.bingapis.com/api/v6/localbusinesses/YN1226x25906078?setLang=en-CA",
//                 "IsPreviouslyUsed": false, "DisplayName": "The Home Depot",
//                 "Address": {
//                     "Street": "99 Cross Ave",
//                     "City": "Oakville", "State": "ON", "CountryOrRegion": "Canada", "PostalCode": "L6J 2W7"
//                 }, "Coordinates": { "Latitude": 43.4548, "Longitude": -79.6886 }
//             },
//             "LocationType": "LocalBusiness",
//             "RelevanceScore": -20.0,
//             "RelevanceHint": "NonHistory"
//         },
//         {
//             "MeetingLocation":
//             {
//                 "EntityType": "LocalBusiness", "LocationSource": "Bing",
//                 "LocationUri": "https://www.bingapis.com/api/v6/localbusinesses/YN1226x262267234?setLang=en-CA",
//                 "UniqueId": "https://www.bingapis.com/api/v6/localbusinesses/YN1226x262267234?setLang=en-CA", "IsPreviouslyUsed": false, "DisplayName": "The Home Depot", "Address": { "Street": "3300 South Service Rd W", "City": "Oakville", "State": "ON", "CountryOrRegion": "Canada", "PostalCode": "L6L 0B1" }, "Coordinates": { "Latitude": 43.3994, "Longitude": -79.7496 }
//             }, "LocationType": "LocalBusiness", "RelevanceScore": -20.0, "RelevanceHint": "NonHistory"
//         }, { "MeetingLocation": { "EntityType": "LocalBusiness", "LocationSource": "Bing", "LocationUri": "https://www.bingapis.com/api/v6/localbusinesses/YN1227x25906192?setLang=en-CA", "UniqueId": "https://www.bingapis.com/api/v6/localbusinesses/YN1227x25906192?setLang=en-CA", "IsPreviouslyUsed": false, "DisplayName": "The Home Depot", "Address": { "Street": "3050 Davidson Crt", "City": "Burlington", "State": "ON", "CountryOrRegion": "Canada", "PostalCode": "L7M 4M9" }, "Coordinates": { "Latitude": 43.3557, "Longitude": -79.8067 } }, "LocationType": "LocalBusiness", "RelevanceScore": -20.0, "RelevanceHint": "NonHistory" }, { "MeetingLocation": { "EntityType": "LocalBusiness", "LocationSource": "Bing", "LocationUri": "https://www.bingapis.com/api/v6/localbusinesses/YN1226x15474422097876230312?setLang=en-CA", "UniqueId": "https://www.bingapis.com/api/v6/localbusinesses/YN1226x15474422097876230312?setLang=en-CA", "IsPreviouslyUsed": false, "DisplayName": "The Home Depot", "Address": { "Street": "2555 Bristol Circle", "City": "Oakville", "State": "ON", "CountryOrRegion": "Canada", "PostalCode": "L6H 5W9" }, "Coordinates": { "Latitude": 43.518, "Longitude": -79.6847 } }, "LocationType": "LocalBusiness", "RelevanceScore": -20.0, "RelevanceHint": "NonHistory" }, { "MeetingLocation": { "EntityType": "LocalBusiness", "LocationSource": "Bing", "LocationUri": "https://www.bingapis.com/api/v6/localbusinesses/YN1228x262604067?setLang=en-CA", "UniqueId": "https://www.bingapis.com/api/v6/localbusinesses/YN1228x262604067?setLang=en-CA", "IsPreviouslyUsed": false, "DisplayName": "The Home Depot", "Address": { "Street": "350 Centennial Pky N", "City": "Hamilton", "State": "ON", "CountryOrRegion": "Canada", "PostalCode": "L8E 2X4" }, "Coordinates": { "Latitude": 43.2402, "Longitude": -79.7575 } }, "LocationType": "LocalBusiness", "RelevanceScore": -20.0, "RelevanceHint": "NonHistory" }],
//     "EmptyLocationsHint": ""
// }