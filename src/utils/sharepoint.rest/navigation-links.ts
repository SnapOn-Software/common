import { isNullOrEmptyString, isNullOrUndefined } from "../../helpers/typecheckers";
import { INavLinkInfo } from "../../types/sharepoint.types";
import { ConsoleLogger } from "../consolelogger";
import { GetJson } from "../rest";
import { GetRestBaseUrl, GetSiteUrl } from "./common";

const logger = ConsoleLogger.get("utils/sharepoint.rest/navigation-links");

/** 
 * Get all navigation links in the top and side navigation of a SharePoint site 
 * @param siteUrl The URL of the SharePoint site
 * @returns An array containing all navigation links
 */
export async function GetNavigationLinks(siteUrl?: string): Promise<INavLinkInfo[]> {
    siteUrl = GetSiteUrl(siteUrl);
    const topNavUrl = `${GetRestBaseUrl(siteUrl)}/web/navigation/topnavigationbar`;
    const sideNavUrl = `${GetRestBaseUrl(siteUrl)}/web/navigation/quicklaunch`;

    try {
        const topNavResponse = await GetJson<{ d: { results: INavLinkInfo[] } }>(topNavUrl);
        const sideNavResponse = await GetJson<{ d: { results: INavLinkInfo[] } }>(sideNavUrl);

        const topNavLinks: INavLinkInfo[] = topNavResponse.d.results.map((link: INavLinkInfo) => ({ ...link, Location: "topnavigationbar" }));
        const sideNavLinks: INavLinkInfo[] = sideNavResponse.d.results.map((link: INavLinkInfo) => ({ ...link, Location: "quicklaunch" }));

        return [...topNavLinks, ...sideNavLinks];
    } catch (error) {
        logger.error(`Error fetching navigation links: ${error.message}`);
    }
    return [];
}

/** 
 * Add a navigation link to the specified location (top navigation or side navigation) 
 * @param title The title of the navigation link
 * @param url The url of the navigation link
 * @param location The location where the link will be added ('topnavigationbar' or 'quicklaunch'). Default is 'quicklaunch'.
 * @Logs If the location is invalid or if adding the link fails
 */
export async function AddNavigationLink(title: string, url: string, location: 'topnavigationbar' | 'quicklaunch' = 'quicklaunch'): Promise<INavLinkInfo> {
    try {
        let siteUrl = GetSiteUrl();
        let navigationUrl = "";
        navigationUrl = `${GetRestBaseUrl(siteUrl)}/web/navigation/${location}`;
        const response = await GetJson<{ d: INavLinkInfo }>(navigationUrl, JSON.stringify({
            '__metadata': { 'type': 'SP.NavigationNode' },
            'Title': title,
            'Url': url
        }), {
            spWebUrl: siteUrl,
        });


        if (!isNullOrUndefined(response) && !isNullOrUndefined(response.d)) {
            return response.d;
        }
    } catch (error) {
        logger.error('Error adding link');
    }
}

/** 
 * Delete navigation links by title and URL
 * @param navLinks An array of navigation links to be deleted
 * @Logs If the location is invalid or if deleting the links fails
 */
export async function DeleteNavigationLinks(navLinks: INavLinkInfo[]): Promise<void> {
    try {
        const siteUrl = GetSiteUrl();
        for (const navLink of navLinks) {
            const navigationUrl = `${GetRestBaseUrl(siteUrl)}/web/Navigation/GetNodeById(${navLink.Id})`;
            // Use the same convention to make the DELETE request
            const response = await GetJson<any>(navigationUrl, null, {
                method: 'POST',
                spWebUrl: siteUrl,
                xHttpMethod: 'DELETE'
            });

            if (!isNullOrEmptyString(response) && !response.ok) {
                logger.error('Failed to delete link');
            }
        }
        logger.info('Navigation links deleted successfully');
    } catch (error) {
        logger.error('Error deleting links');
    }
}