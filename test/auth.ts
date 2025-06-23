import {ConfidentialClientApplication, Configuration} from "@azure/msal-node";
import * as fs from "node:fs";

import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: "test/.env" });


const config: Configuration = {
    auth: {
        clientId: process.env.clientId,
        authority: `https://login.microsoftonline.com/${process.env.tenantId}`,
        clientCertificate: {
            thumbprintSha256: process.env.clientCertificateThumbprint,
            privateKey: fs.readFileSync(process.env.clientKeyPath, "utf8"),
        }
    },
};

const clientCredentialRequest = {
    scopes: [`https://${process.env.tenantName}.sharepoint.com/.default`]
};

const cca = new ConfidentialClientApplication(config);

export async function getToken() {
    const auth = await cca.acquireTokenByClientCredential(clientCredentialRequest)
    return auth.accessToken;
}
