import { firstOrNull } from "../../helpers/collections.base";
import { getUniqueId } from "../../helpers/random";
import { isNullOrEmptyString, isNullOrUndefined, isNumber, isTypeofFullNameNullOrUndefined } from "../../helpers/typecheckers";
import { SPFxAuthToken, SPFxAuthTokenType } from "../../types/auth";
import { IRestOptions } from "../../types/rest.types";
import { getCacheItem, setCacheItem } from "../localstoragecache";
import { GetJson, GetJsonSync } from "../rest";
import { GetRestBaseUrl } from "../sharepoint.rest/common";

export function GetTokenAudiencePrefix(appId: string) {
    return `api://${appId}`;
}
export function GetDefaultScope(appId: string) {
    return `${GetTokenAudiencePrefix(appId)}/access_as_user`;
}
export function GetMSALSiteScope(hostName: string) {
    return `https://${hostName}`;
}

function _getGetSPFxClientAuthTokenParams(siteUrl: string, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    let acquireURL = `${GetRestBaseUrl(siteUrl)}/SP.OAuth.Token/Acquire`;
    //todo: add all the resource end points (ie. OneNote, Yammer, Stream)
    let resource = "";
    let isSPOToken = false;
    switch (spfxTokenType) {
        case SPFxAuthTokenType.Outlook:
            resource = "https://outlook.office365.com/search";
            break;
        case SPFxAuthTokenType.SharePoint:
        case SPFxAuthTokenType.MySite:
            isSPOToken = true;
            resource = new URL(acquireURL).origin;
            if (spfxTokenType === SPFxAuthTokenType.MySite) {
                let split = resource.split(".");
                split[0] += "-my";
                resource = split.join(".");
            }
            break;
        default:
            resource = "https://graph.microsoft.com";
    }

    let data = {
        resource: resource,
        tokenType: isSPOToken ? "SPO" : undefined
    };

    let params: {
        url: string,
        body: string,
        options: IRestOptions
    } = {
        url: acquireURL,
        body: JSON.stringify(data),
        options: {
            allowCache: false,
            // ...shortLocalCache,
            // postCacheKey: `${spfxTokenType}_${_spPageContextInfo.webId}`,
            includeDigestInPost: true,
            headers: {
                "Accept": "application/json;odata.metadata=minimal",
                "content-type": "application/json; charset=UTF-8",
                "odata-version": "4.0",
            }
        }
    };

    return params;
}

function _parseAndCacheGetSPFxClientAuthTokenResult(result: SPFxAuthToken, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    if (!isNullOrUndefined(result) && !isNullOrEmptyString(result.access_token)) {
        let expiration = isNumber(result.expires_on) ?
            new Date(result.expires_on * 1000) :
            {
                minutes: 15
            };

        setCacheItem(`access_token_${spfxTokenType}`, result.access_token, expiration);

        return result.access_token;
    }
    return null;
}

function _getSPFxClientAuthTokenFromCache(spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    let cachedToken = getCacheItem<string>(`access_token_${spfxTokenType}`);
    if (!isNullOrEmptyString(cachedToken)) {
        return cachedToken;
    }
    return null;
}

function _getSPFxClientAuthTokenFromMSALCache(resource: string, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    try {
        let cachedToken: {
            expiration: number;
            value: string;
        };

        for (let key in localStorage) {
            if (key.startsWith(`Identity.OAuth.${_spPageContextInfo.systemUserKey}`)
                && key.indexOf(resource) !== -1) {
                cachedToken = JSON.parse(localStorage.getItem(key));
                break;
            }
        }

        if (!isNullOrUndefined(cachedToken)) {
            return _parseAndCacheGetSPFxClientAuthTokenResult({
                access_token: cachedToken.value,
                expires_on: cachedToken.expiration.toString(),
                resource: resource,
                scope: null,
                token_type: "Bearer"
            }, spfxTokenType);
        }
    } catch {
    }

    return null;
}

/** Acquire an authorization token for a Outlook, Graph, or SharePoint the same way SPFx clients do */
export async function GetSPFxClientAuthToken(siteUrl: string, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo") && _spPageContextInfo.isAppWeb === true) {
        return null;
    }

    let cachedToken = _getSPFxClientAuthTokenFromCache(spfxTokenType);
    if (!isNullOrEmptyString(cachedToken)) {
        return cachedToken;
    }

    if (spfxTokenType === SPFxAuthTokenType.Graph) {
        let resource = "https://graph.microsoft.com";

        let token = _getSPFxClientAuthTokenFromMSALCache(resource, spfxTokenType);
        if (!isNullOrEmptyString(token)) {
            return token;
        }

        try {
            let _spComponentLoader = window["_spComponentLoader"]
            let manifests: { alias: string; id: string }[] = _spComponentLoader.getManifests();
            let manifest = firstOrNull(manifests, (manifest) => {
                return manifest.alias === "@microsoft/sp-http-base";
            });
            let module = await _spComponentLoader.loadComponentById(manifest.id)
            let factory = new module.AadTokenProviderFactory();
            let provider = await factory.getTokenProvider();
            let token = await provider.getToken(resource, true);
            if (!isNullOrEmptyString(token)) {
                return _parseAndCacheGetSPFxClientAuthTokenResult({
                    access_token: token,
                    expires_on: null,
                    resource: resource,
                    scope: null,
                    token_type: "Bearer"
                }, spfxTokenType);
            }
        } catch {
        }

        try {
            let bufferToString = (buffer: Uint16Array | Uint32Array | Uint8Array) => {
                let result = Array.from(buffer, (c) => { return String.fromCodePoint(c) }).join("");
                return window.btoa(result);
            };

            let ni = new Uint32Array(1);
            let ci = () => {
                let b = window.crypto.getRandomValues(ni);
                return b[0];
            };
            let generateNonce = () => {
                let ti = "0123456789abcdef";
                const e = Date.now()
                    , t = 1024 * ci() + (1023 & ci())
                    , n = new Uint8Array(16)
                    , a = Math.trunc(t / 2 ** 30)
                    , i = t & 2 ** 30 - 1
                    , r = ci();
                n[0] = e / 2 ** 40,
                    n[1] = e / 2 ** 32,
                    n[2] = e / 2 ** 24,
                    n[3] = e / 65536,
                    n[4] = e / 256,
                    n[5] = e,
                    n[6] = 112 | a >>> 8,
                    n[7] = a,
                    n[8] = 128 | i >>> 24,
                    n[9] = i >>> 16,
                    n[10] = i >>> 8,
                    n[11] = i,
                    n[12] = r >>> 24,
                    n[13] = r >>> 16,
                    n[14] = r >>> 8,
                    n[15] = r;
                let o = "";
                for (let e = 0; e < n.length; e++)
                    o += ti.charAt(n[e] >>> 4),
                        o += ti.charAt(15 & n[e]),
                        3 !== e && 5 !== e && 7 !== e && 9 !== e || (o += "-");
                return o
            }

            let requestId = getUniqueId();

            let stateBuffer = new TextEncoder().encode(JSON.stringify({
                id: getUniqueId(),
                meta: {
                    interactionType: "silent"
                }
            }));
            let state = bufferToString(stateBuffer);

            let redirectUri = `https://${window.location.host}/_forms/spfxsinglesignon.aspx`;
            let sid = _spPageContextInfo["aadSessionId"];

            let codeVerifierBuffer = window.crypto.getRandomValues(new Uint8Array(32));
            let codeVerifier = bufferToString(codeVerifierBuffer).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

            let codeChallengeBuffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
            let codeChallenge = bufferToString(new Uint8Array(codeChallengeBuffer)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

            let nonce = generateNonce();

            let url = `${_spPageContextInfo["aadInstanceUrl"]}/${_spPageContextInfo.aadTenantId}/oauth2/v2.0/authorize?`;
            url += `client_id=08e18876-6177-487e-b8b5-cf950c1e598c`;
            url += `&scope=${encodeURIComponent("https://graph.microsoft.com/.default openid profile offline_access")}`;
            url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
            url += `&client-request-id=${encodeURIComponent(requestId)}`;
            url += `&response_mode=fragment`;
            url += `&response_type=code`;
            url += `&code_challenge=${codeChallenge}&code_challenge_method=S256&prompt=none`;
            url += `&sid=${encodeURIComponent(sid)}&nonce=${nonce}`;
            url += `&state=${encodeURIComponent(state)}`;

            let getCodeFromIframe = async () => {
                return new Promise<string>((resolve, reject) => {
                    try {
                        let iframe = document.createElement("iframe") as HTMLIFrameElement;
                        iframe.style.display = "none";
                        iframe.src = url;
                        iframe.onload = () => {
                            window.setTimeout(() => {
                                let params = new URLSearchParams(iframe.contentWindow.location.hash.replace("#", "?"));
                                let pCode = params.get("code");
                                let pState = params.get("state");
                                let pSid = params.get("session_state");
                                if (!isNullOrEmptyString(pCode) && pState === state && pSid === sid) {
                                    resolve(pCode);
                                } else {
                                    reject();
                                }

                                document.removeChild(iframe);
                            }, 100)
                        };

                        document.body.appendChild(iframe);
                    } catch {
                        reject();
                    }
                });
            };

            let authCode = await getCodeFromIframe();
            if (!isNullOrEmptyString(authCode)) {
                let url = `${_spPageContextInfo["aadInstanceUrl"]}/${_spPageContextInfo.aadTenantId}/oauth2/v2.0/token?`;
                url += `client-request-id=${encodeURIComponent(requestId)}`;

                let fd = new FormData();
                fd.append("client_id", "08e18876-6177-487e-b8b5-cf950c1e598c");
                fd.append("scope", "https://graph.microsoft.com/.default openid profile offline_access");
                fd.append("redirect_uri", redirectUri);
                fd.append("code", authCode);
                fd.append("grant_type", "authorization_code");
                fd.append("code_verifier", codeVerifier);

                let response = await fetch(url, {
                    method: "POST",
                    body: fd
                });

                if (response.ok) {
                    let authToken = await response.json() as SPFxAuthToken;
                    return _parseAndCacheGetSPFxClientAuthTokenResult(authToken, spfxTokenType);
                }
            }
        } catch {
        }
    } else {
        try {
            let { url, body, options } = _getGetSPFxClientAuthTokenParams(siteUrl, spfxTokenType);
            let result = await GetJson<SPFxAuthToken>(url, body, options);
            return _parseAndCacheGetSPFxClientAuthTokenResult(result, spfxTokenType);
        } catch {
        }
    }

    return null;
}

/** Acquire an authorization token for a Outlook, Graph, or SharePoint the same way SPFx clients do */
export function GetSPFxClientAuthTokenSync(siteUrl: string, spfxTokenType: SPFxAuthTokenType = SPFxAuthTokenType.Graph) {
    if (!isTypeofFullNameNullOrUndefined("_spPageContextInfo") && _spPageContextInfo.isAppWeb === true) {
        return null;
    }

    let cachedToken = _getSPFxClientAuthTokenFromCache(spfxTokenType);
    if (!isNullOrEmptyString(cachedToken)) {
        return cachedToken;
    }

    if (spfxTokenType === SPFxAuthTokenType.Graph) {
        let resource = "https://graph.microsoft.com";
        let token = _getSPFxClientAuthTokenFromMSALCache(resource, spfxTokenType);

        if (!isNullOrEmptyString(token)) {
            return token;
        }

        // Cache it for next time using the async method
        GetSPFxClientAuthToken(siteUrl, spfxTokenType);
    } else {
        try {
            let { url, body, options } = _getGetSPFxClientAuthTokenParams(siteUrl, spfxTokenType);
            let response = GetJsonSync<SPFxAuthToken>(url, body, options);
            return _parseAndCacheGetSPFxClientAuthTokenResult(response.result, spfxTokenType);
        } catch {
        }
    }

    return null;
}