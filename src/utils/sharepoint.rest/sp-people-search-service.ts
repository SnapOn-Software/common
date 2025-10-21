import { firstIndexOf } from "../../helpers/collections.base";
import { isNullOrEmptyString, isString } from "../../helpers/typecheckers";
import { makeFullUrl, normalizeUrl } from "../../helpers/url";
import { contentTypes, jsonTypes } from "../../types/rest.types";
import { PrincipalType } from "../../types/sharepoint.types";
import { IUserInfo } from "../../types/sharepoint.utils.types";
import { GetJson } from "../rest";
import { GetSiteUrl } from "./common";
import { EnsureUser } from "./user";

export interface iPeoplePickerUserItem {
    /** LoginName or Id of the principal in the site. */
    id: string;
    /** LoginName of the principal. */
    loginName: string;

    //todo: move these properties outside of this service, it should return the raw results 
    //ISPPeopleSearchServiceResultBase | ISecGroupSearchResult | IFormsRoleSearchResult | IUserSearchResult | ISPGroupSearchResult
    imageUrl: string;
    imageInitials: string;
    text: string; // name
    secondaryText: string; // role
    tertiaryText: string; // status
    optionalText: string; // anything

    entityType: "SecGroup" | "FormsRole" | "User" | "SPGroup",
    jobTitle?: string;
    aadId?: string;
    department?: string;
    email?: string;
    mobilePhone?: string;
    description?: string;
    displayName?: string;
}

interface ISPPeopleSearchServiceResultBase {
    Description: string;
    DisplayText: string;
    EntityData?: {
        PrincipalType?: string;
    }
    EntityType: "SecGroup" | "FormsRole" | "User" | "SPGroup",
    IsResolved: boolean;
    Key: string;
    MultipleMatches: any[];
    ProviderDisplayName: string;
    ProviderName: string;
}

interface ISecGroupSearchResult extends ISPPeopleSearchServiceResultBase {
    EntityData?: {
        PrincipalType?: string;
        DisplayName: string;
        Email: string;
    },
    EntityType: "SecGroup"
}

interface IFormsRoleSearchResult extends ISPPeopleSearchServiceResultBase {
    EntityData: {},
    EntityType: "FormsRole"
}

interface IUserSearchResult extends ISPPeopleSearchServiceResultBase {
    EntityData: {
        PrincipalType?: string;
        Department: string;
        Email: string;
        IsAltSecIdPresent: boolean;
        MobilePhone: string;
        ObjectId: string;
        Title: string;
        UserKey: string;
        OtherMails?: string[]
    },
    EntityType: "User"
}

interface ISPGroupSearchResult extends ISPPeopleSearchServiceResultBase {
    EntityData: {
        AccountName: string;
        ObjectId: string;
        PrincipalType: "SharePointGroup",
        SPGroupID: string;
        UserKey: string;
    },
    EntityType: "SPGroup"
}

type SPPeopleSearchServiceResult = { Id: string } & (ISPPeopleSearchServiceResultBase | ISecGroupSearchResult | IFormsRoleSearchResult | IUserSearchResult | ISPGroupSearchResult);

function isSecGroupResult(result: ISPPeopleSearchServiceResultBase): result is ISecGroupSearchResult {
    return (result as ISecGroupSearchResult).EntityType === "SecGroup";
}

function isFormsRoleResult(result: ISPPeopleSearchServiceResultBase): result is IFormsRoleSearchResult {
    return (result as IFormsRoleSearchResult).EntityType === "FormsRole";
}

function isUserResult(result: ISPPeopleSearchServiceResultBase): result is IUserSearchResult {
    return (result as IUserSearchResult).EntityType === "User";
}

function isSPGroupResult(result: ISPPeopleSearchServiceResultBase): result is ISPGroupSearchResult {
    return (result as ISPGroupSearchResult).EntityType === "SPGroup";
}

/**
 * Service implementation to search people in SharePoint
 */
export class SPPeopleSearchService {
    private cachedLocalUsers: { [siteUrl: string]: IUserInfo[] };

    /**
     * Service constructor
     */
    constructor(private context: { siteUrl }) {
        this.cachedLocalUsers = {};
        //ISSUE: 2154
        this.context.siteUrl = makeFullUrl(GetSiteUrl(this.context.siteUrl));
        this.cachedLocalUsers[this.context.siteUrl] = [];
    }

    /**
     * Generate the user photo link using SharePoint user photo endpoint.
     *
     * @param value
     */
    public generateUserPhotoLink(value: string, size: "S" | "M" = "M"): string {
        return `${normalizeUrl(this.context.siteUrl)}/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(value)}&size=M`;
    }

    /**
     * Generate sum of principal types
     *
     * PrincipalType controls the type of entities that are returned in the results.
     * Choices are All - 15, Distribution List - 2 , Security Groups - 4, SharePoint Groups - 8, User - 1.
     * These values can be combined (example: 13 is security + SP groups + users)
     *
     * @param principalTypes
     */
    public getSumOfPrincipalTypes(principalTypes: PrincipalType[]) {
        return !!principalTypes && principalTypes.length > 0 ? principalTypes.reduce((a, b) => a + b, 0) : 1;
    }

    /**
     * Retrieve the specified group
     *
     * @param groupName
     * @param siteUrl
     */
    public async getGroupId(groupName: string, siteUrl: string = null): Promise<number | null> {
        // if (Environment.type === EnvironmentType.Local) {
        //     return 1;
        // } else {
        const groups = await this.searchTenant(siteUrl, groupName, 1, [PrincipalType.SharePointGroup], false, 0);
        return (groups && groups.length > 0) ? parseInt(groups[0].id) : null;
        //}
    }

    /**
     * Search person by its email or login name
     */
    public async searchPersonByEmailOrLogin(email: string, principalTypes: PrincipalType[], siteUrl: string = null, groupId: number = null, ensureUser: boolean = false): Promise<iPeoplePickerUserItem> {
        // if (Environment.type === EnvironmentType.Local) {
        //     // If the running environment is local, load the data from the mock
        //     const mockUsers = await this.searchPeopleFromMock(email);
        //     return (mockUsers && mockUsers.length > 0) ? mockUsers[0] : null;
        // } else {
        const userResults = await this.searchTenant(siteUrl, email, 1, principalTypes, ensureUser, groupId);
        return (userResults && userResults.length > 0) ? userResults[0] : null;
        //}
    }

    /**
     * Search All Users from the SharePoint People database
     */
    public async searchPeople(query: string, maximumSuggestions: number, principalTypes: PrincipalType[], siteUrl: string = null, groupId: number = null, ensureUser: boolean = false): Promise<iPeoplePickerUserItem[]> {
        // if (Environment.type === EnvironmentType.Local) {
        //     // If the running environment is local, load the data from the mock
        //     return this.searchPeopleFromMock(query);
        // } else {
        return await this.searchTenant(siteUrl, query, maximumSuggestions, principalTypes, ensureUser, groupId);
        //}
    }

    /**
     * Tenant search
     */
    private async searchTenant(siteUrl: string, query: string, maximumSuggestions: number, principalTypes: PrincipalType[], ensureUser: boolean, groupId: number): Promise<iPeoplePickerUserItem[]> {
        try {
            // If the running env is SharePoint, loads from the peoplepicker web service
            let baseUrl = this.context.siteUrl;
            if (!isNullOrEmptyString(siteUrl)) {
                baseUrl = makeFullUrl(GetSiteUrl(siteUrl));
            }
            baseUrl = normalizeUrl(baseUrl);

            const userRequestUrl: string = `${baseUrl}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser`;
            const searchBody = {
                queryParams: {
                    AllowEmailAddresses: true,
                    AllowMultipleEntities: false,
                    AllUrlZones: false,
                    MaximumEntitySuggestions: maximumSuggestions,
                    PrincipalSource: 15,
                    PrincipalType: this.getSumOfPrincipalTypes(principalTypes),
                    QueryString: query
                }
            };

            // Search on the local site when "0"
            if (siteUrl) {
                searchBody.queryParams["SharePointGroupID"] = 0;
            }

            // Check if users need to be searched in a specific group
            if (groupId) {
                searchBody.queryParams["SharePointGroupID"] = groupId;
            }

            // Do the call against the People REST API endpoint            
            const userDataResp = await GetJson<{ value: string; }>(
                userRequestUrl,
                JSON.stringify(searchBody),
                {
                    headers: {
                        Accept: jsonTypes.standard,
                        "content-type": contentTypes.json
                    },
                    spWebUrl: siteUrl//allow getDigest to work when not in SharePoint
                })

            if (userDataResp && userDataResp.value && userDataResp.value.length > 0) {
                let values: SPPeopleSearchServiceResult[];

                if (isString(userDataResp.value)) {
                    values = JSON.parse(userDataResp.value);
                } else {
                    values = userDataResp.value;
                }

                // Filter out "UNVALIDATED_EMAIL_ADDRESS"
                values = values.filter(v => !(v.EntityData
                    && (v as ISPPeopleSearchServiceResultBase).EntityData.PrincipalType
                    && (v as ISPPeopleSearchServiceResultBase).EntityData.PrincipalType === "UNVALIDATED_EMAIL_ADDRESS"));

                // Check if local user IDs need to be retrieved
                if (ensureUser) {
                    for (const value of values) {
                        // Only ensure the user if it is not a SharePoint group
                        if (!value.EntityData || (value.EntityData && typeof (value as ISPGroupSearchResult).EntityData.SPGroupID === "undefined")) {
                            const id = await this.ensureUser(value.Key);
                            value.Id = `${id}`;
                        }
                    }
                }

                // Filter out NULL keys
                values = values.filter(v => v.Key !== null);
                const userResults = values.map(element => {
                    if (isUserResult(element)) {
                        return {
                            id: `${element.Id || element.Key}`,
                            loginName: element.Key,
                            imageUrl: this.generateUserPhotoLink(element.Description || ""),
                            imageInitials: this.getFullNameInitials(element.DisplayText),
                            text: element.DisplayText, // name
                            secondaryText: element.EntityData.Email || element.Description, // email
                            tertiaryText: "", // status
                            optionalText: "", // anything
                            entityType: "User",
                            description: element.Description,
                            department: element.EntityData.Department,
                            email: element.EntityData.Email || element.Description,
                            mobilePhone: element.EntityData.MobilePhone,
                            aadId: element.EntityData.ObjectId,
                            jobTitle: element.EntityData.Title,
                            displayName: element.DisplayText
                        } as iPeoplePickerUserItem;
                    } else if (isSecGroupResult(element)) {
                        return {
                            id: `${element.Id || element.Key}`,
                            loginName: element.Key,
                            imageInitials: this.getFullNameInitials(element.DisplayText),
                            text: element.DisplayText,
                            secondaryText: element.ProviderName,
                            entityType: "SecGroup",
                            email: element.EntityData.Email,
                            description: element.Description,
                            displayName: element.EntityData.DisplayName || element.DisplayText
                        } as iPeoplePickerUserItem;
                    } else if (isFormsRoleResult(element)) {
                        return {
                            id: `${element.Id || element.Key}`,
                            loginName: element.Key,
                            imageInitials: this.getFullNameInitials(element.DisplayText),
                            text: element.DisplayText,
                            secondaryText: element.ProviderName,
                            entityType: "FormsRole",
                            description: element.Description,
                            displayName: element.DisplayText
                        } as iPeoplePickerUserItem;
                    } else {
                        let spGroupResult = element as ISPGroupSearchResult;
                        return {
                            id: spGroupResult.EntityData.SPGroupID,
                            loginName: spGroupResult.EntityData.AccountName,
                            imageInitials: this.getFullNameInitials(element.DisplayText),
                            text: element.DisplayText,
                            secondaryText: spGroupResult.EntityData.AccountName,
                            entityType: "SPGroup",
                            description: spGroupResult.Description,
                            displayName: spGroupResult.DisplayText || spGroupResult.EntityData.AccountName
                        } as iPeoplePickerUserItem;
                    }
                });

                return userResults;
            }

            // Nothing to return
            return [];
        } catch (e) {
            console.error("PeopleSearchService::searchTenant: error occured while fetching the users.");
            return [];
        }
    }

    /**
     * Retrieves the local user ID
     *
     * @param userId
     */
    private async ensureUser(userId: string): Promise<number> {
        const siteUrl = this.context.siteUrl;
        if (this.cachedLocalUsers && this.cachedLocalUsers[siteUrl]) {
            const users = this.cachedLocalUsers[siteUrl];
            const userIdx = firstIndexOf(users, u => u.LoginName === userId);
            if (userIdx !== -1) {
                return users[userIdx].Id;
            }
        }

        const user = await EnsureUser(siteUrl, userId)
        if (user && user.Id) {
            this.cachedLocalUsers[siteUrl].push(user);
            return user.Id;
        }
        return null;
    }

    /**
     * Generates Initials from a full name
     */
    private getFullNameInitials(fullName: string): string {
        if (fullName === null) {
            return fullName;
        }

        const words: string[] = fullName.split(' ');
        if (words.length === 0) {
            return '';
        } else if (words.length === 1) {
            return words[0].charAt(0);
        } else {
            return (words[0].charAt(0) + words[1].charAt(0));
        }
    }
}