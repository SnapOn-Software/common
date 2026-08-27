export interface insTokenInfo {
    accountId: string;
    clientId: string;
    clientSecret: string;
    tokenId: string;
    tokenSecret: string;
}
export interface insAccessToken {
    accountId: string;
    accessToken: string;
    userId?: string;
    refreshToken?: string;
    /** for users who changed their ui language, rest api will require this to be sent in header */
    acceptLanguage?: string;
}
export type tnsContext = insTokenInfo | insAccessToken;
export type tnsRecordContext = tnsContext & { record: string; };
