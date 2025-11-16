export interface ITenantInfo {
    environment: AzureEnvironment;
    idOrName: string;
    authorityUrl: string;
    valid: boolean;
}

// eslint-disable-next-line no-shadow
export enum AzureEnvironment {
    Production = 0,
    PPE = 1,
    China = 2,
    Germany = 3,
    USGovernment = 4
}
/** AuthenticationModes enum values for projects that can't use enums (when isolatedModules is true)  
 * @deprecated use AzureEnvironment
 */
export const $AzureEnvironment = {
    Production: 0,
    PPE: 1,
    China: 2,
    Germany: 3,
    USGovernment: 4,
}

// eslint-disable-next-line no-shadow
export enum AuthenticationModes {
    Certificate = "certificate",
    clientSecret = "secret"
}
/** AuthenticationModes enum values for projects that can't use enums (when isolatedModules is true) */
export const $AuthenticationModes = {
    Certificate: AuthenticationModes.Certificate,
    clientSecret: AuthenticationModes.clientSecret,
};


export type AuthContextType = {
    authenticationMode: AuthenticationModes.Certificate,
    clientId: string,
    privateKey: string,
    thumbprint: string
} | {
    authenticationMode: AuthenticationModes.clientSecret,
    clientId: string,
    clientSecret: string
};

export enum SPFxAuthTokenType {
    Outlook,
    SharePoint,
    Graph,
    MySite
}

// access_token: ""
// client_info: ""
// expires_in: 
// ext_expires_in: 
// id_token: ""
// refresh_token: ""
// refresh_token_expires_in: 
// scope: "profile openid email https://graph.microsoft.com/AppCatalog.Read.All https://graph.microsoft.com/AppCatalog.Submit https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.Read.Shared https://graph.microsoft.com/Channel.Create https://graph.microsoft.com/Channel.ReadBasic.All https://graph.microsoft.com/ChatMember.Read https://graph.microsoft.com/Contacts.Read https://graph.microsoft.com/EduAssignments.ReadBasic https://graph.microsoft.com/EduRoster.ReadBasic https://graph.microsoft.com/Files.Read https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/FileStorageContainer.Selected https://graph.microsoft.com/Group.Read.All https://graph.microsoft.com/Group-Conversation.ReadWrite.All https://graph.microsoft.com/GroupMember.Read.All https://graph.microsoft.com/InformationProtectionPolicy.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Notes.Read.All https://graph.microsoft.com/People.Read https://graph.microsoft.com/People.Read.All https://graph.microsoft.com/Presence.Read.All https://graph.microsoft.com/PrinterShare.ReadBasic.All https://graph.microsoft.com/PrintJob.Create https://graph.microsoft.com/PrintJob.ReadBasic https://graph.microsoft.com/SensitivityLabel.Read https://graph.microsoft.com/Sites.FullControl.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Sites.ReadWrite.All https://graph.microsoft.com/Tasks.ReadWrite https://graph.microsoft.com/Team.ReadBasic.All https://graph.microsoft.com/TeamsAppInstallation.ReadWriteForTeam https://graph.microsoft.com/TeamsAppInstallation.ReadWriteSelfForTeam https://graph.microsoft.com/TeamsTab.Create https://graph.microsoft.com/TermStore.ReadWrite.All https://graph.microsoft.com/User.Read https://graph.microsoft.com/User.Read.All https://graph.microsoft.com/User.ReadBasic.All https://graph.microsoft.com/.default"
// token_type: "Bearer"
export interface ISPFxOAuthToken {    
    access_token: string;
    client_info?: string;   
    /** Number of seconds that have elapsed since January 1, 1970, 00:00:00 UTC */
    expires_on?: string | number;
     /** Seconds until token expires */
    expires_in?: number;
    ext_expires_in?: number;
    id_token?: string;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope: string;
    token_type: "Bearer";
    resource: string;
}