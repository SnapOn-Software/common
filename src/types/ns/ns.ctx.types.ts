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
}
export type tnsContext = insTokenInfo | insAccessToken;
export type tnsRecordContext = tnsContext & { record: string; };
