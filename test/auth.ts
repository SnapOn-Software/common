import {ConfidentialClientApplication, Configuration} from "@azure/msal-node";
import assert from "assert";

assert(process.env.clientId, "clientId must be set in .env");
assert(process.env.tenantId, "tenantId must be set in .env");
assert(process.env.clientCertificateThumbprint, "clientCertificateThumbprint must be set in .env");
assert(process.env.clientKey, "clientKey must be set in .env");

const config: Configuration = {
    auth: {
        clientId: process.env.clientId,
        authority: `https://login.microsoftonline.com/${process.env.tenantId}`,
        clientCertificate: {
            thumbprintSha256: process.env.clientCertificateThumbprint,
            privateKey: process.env.clientKey
        }
    },
};

const clientCredentialRequest = {
    scopes: [`https://${process.env.tenantName}.sharepoint.com/.default`]
};

const cca = new ConfidentialClientApplication(config);

export async function getToken() {
    const auth = await cca.acquireTokenByClientCredential(clientCredentialRequest)
    assert(auth, "must acquire token");
    return auth.accessToken;
}
