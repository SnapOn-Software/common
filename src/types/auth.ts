export interface ITenantInfo {
    environment: AzureEnvironment;
    idOrName: string;
    authorityUrl: string;
    valid: boolean;
    msGraphHost: string;
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
// scope: "profile openid email https://graph.microsoft.com/.default"
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