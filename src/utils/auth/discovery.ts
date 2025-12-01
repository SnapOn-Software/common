import { promiseOnce } from "../../helpers/promises";
import { isNullOrEmptyString, isValidGuid } from "../../helpers/typecheckers";
import { AzureEnvironment, ITenantInfo } from "../../types/auth";
import { GetJson, GetJsonSync } from "../rest";

interface IOpenidConfiguration {
    token_endpoint: string;//https://login.microsoftonline.com/7d034656-be03-457d-8d82-60e90cf5f400/oauth2/token
    cloud_instance_name: string;//microsoftonline.com
    token_endpoint_auth_methods_supported: string[];// ["client_secret_post", "private_key_jwt", "client_secret_basic"]
    response_modes_supported: string[];// ["query", "fragment", "form_post"]
    response_types_supported: string[];// ["code", "id_token", "code id_token", "token id_token", "token"]
    scopes_supported: string[];// ["openid"]
    issuer: string;//https://sts.windows.net/7d034656-be03-457d-8d82-60e90cf5f400/
    authorization_endpoint: string;//https://login.microsoftonline.com/7d034656-be03-457d-8d82-60e90cf5f400/oauth2/authorize
    device_authorization_endpoint: string;//https://login.microsoftonline.com/7d034656-be03-457d-8d82-60e90cf5f400/oauth2/devicecode
    end_session_endpoint: string;//https://login.microsoftonline.com/7d034656-be03-457d-8d82-60e90cf5f400/oauth2/logout
    userinfo_endpoint: string;//https://login.microsoftonline.com/7d034656-be03-457d-8d82-60e90cf5f400/openid/userinfo
    tenant_region_scope: string;//NA
    cloud_graph_host_name: string;//graph.windows.net
    msgraph_host: string;//graph.microsoft.com
}

function _getFriendlyName(hostName: string) {
    if (hostName.indexOf(".sharepoint.") !== -1) {
        let hostParts = hostName.split('.');//should be xxx.sharepoint.com or xxx.sharepoint.us
        let firstHostPart = hostParts[0];
        let lastHostPart = hostParts[hostParts.length - 1] === "us" || hostParts[hostParts.length - 1] === "de" ? hostParts[hostParts.length - 1] : "com";
        if (firstHostPart.endsWith("-admin")) firstHostPart = firstHostPart.substring(0, firstHostPart.length - 6);
        return `${firstHostPart}.onmicrosoft.${lastHostPart}`;
    } else {
        return hostName;//could be an exchange email domain, or bpos customer
    }
}

function _getOpenIdConfigurationUrl(friendlyName: string) {
    return `https://login.microsoftonline.com/${friendlyName}/v2.0/.well-known/openid-configuration`;
}

function _processOpenidConfiguration(config: IOpenidConfiguration, friendlyName: string) {
    let data: ITenantInfo = {
        environment: AzureEnvironment.Production,
        idOrName: null,
        authorityUrl: null,
        valid: false,
        msGraphHost: null
    };

    let endpoint = config.token_endpoint;//https://xxxx/{tenant}/....
    let tenantId = endpoint.replace("//", "/").split('/')[2];//replace :// with :/ split by / and take the second part.
    let instance = config.cloud_instance_name;//microsoftonline.us

    data.environment = GetEnvironmentFromACSEndPoint(instance);
    if (!isNullOrEmptyString(tenantId) || isValidGuid(tenantId)) {
        data.idOrName = tenantId;
    } else {
        data.idOrName = friendlyName;
    }

    data.authorityUrl = `${GetAzureADLoginEndPoint(data.environment)}/${data.idOrName}`;
    data.valid = true;
    data.msGraphHost = config.msgraph_host;

    return data;
}

export function DiscoverTenantInfo(hostNameOrId: string, sync?: false): Promise<ITenantInfo>
export function DiscoverTenantInfo(hostNameOrId: string, sync: true): ITenantInfo
export function DiscoverTenantInfo(hostNameOrId: string, sync?: boolean): ITenantInfo | Promise<ITenantInfo> {
    hostNameOrId = hostNameOrId.toLowerCase();

    let friendlyName = "";

    if (isValidGuid(hostNameOrId)) {
        friendlyName = hostNameOrId;
    } else {
        friendlyName = _getFriendlyName(hostNameOrId);
    }

    let url = _getOpenIdConfigurationUrl(friendlyName);

    if (sync === true) {
        try {
            let response = GetJsonSync<IOpenidConfiguration>(url);
            let config = response.result;
            let data = _processOpenidConfiguration(config, friendlyName);
            return data;
        } catch (ex) {
            console.log(ex);
        }
        return null;
    } else {
        return promiseOnce(`DiscoverTenantInfo|${hostNameOrId}`, async () => {
            try {
                let config = await GetJson<IOpenidConfiguration>(url);
                let data = _processOpenidConfiguration(config, friendlyName);
                return data;
            }
            catch (ex) {
                console.log(ex);
            }
            return null;
        });
    }
}

export function AutoDiscoverTenantInfo(sync?: false): Promise<ITenantInfo>
export function AutoDiscoverTenantInfo(sync: true): ITenantInfo
export function AutoDiscoverTenantInfo(sync?: boolean): ITenantInfo | Promise<ITenantInfo> {
    if (sync === true) {
        return DiscoverTenantInfo(window.location.hostname.toLowerCase(), true);
    }
    return DiscoverTenantInfo(window.location.hostname.toLowerCase(), false);
}

export function GetEnvironmentFromACSEndPoint(ACSEndPoint: string): AzureEnvironment {
    switch (ACSEndPoint) {
        case "microsoftonline.us":
            return AzureEnvironment.USGovernment;
        case "microsoftonline.de":
            return AzureEnvironment.Germany;
        case "accesscontrol.chinacloudapi.cn":
            return AzureEnvironment.China;
        case "windows-ppe.net":
            return AzureEnvironment.PPE;
        case "accesscontrol.windows.net":
        default:
            return AzureEnvironment.Production;
    }
}

export function GetAzureADLoginEndPoint(environment: AzureEnvironment): string {
    switch (environment) {
        case AzureEnvironment.Germany: return "https://login.microsoftonline.de";
        case AzureEnvironment.China: return "https://login.chinacloudapi.cn";
        case AzureEnvironment.USGovernment: return "https://login.microsoftonline.us";
        case AzureEnvironment.PPE: return "https://login.windows-ppe.net";
        case AzureEnvironment.Production:
        default:
            return "https://login.microsoftonline.com";
    }
}