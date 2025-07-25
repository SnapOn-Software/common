## Credential storage for the SharePoint tenant that integration tests will run on:

- `common/.env` file in local development
- GitHub Actions Secrets in production

## Contents of .env file:

```
tenantName=..
tenantId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
clientId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
clientCertificateThumbprint=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

tempSiteOwner=...@....com
tempSiteUrl=https://....sharepoint.com/sites/...

clientKey="-----BEGIN PRIVATE KEY-----
...............................................................
...............................................................
...............................................................
-----END PRIVATE KEY-----
"
```

> [!IMPORTANT] 
> You should fill in exactly 1 of tempSiteOwner or tempSiteUrl.
> If tempSiteOwner is left blank, then tempSiteUrl will be used and NOT deleted after runing the tests.
> If tempSiteUrl is left blank, then tempSiteOwner will be used to create a temp site which WILL be deleted after running the tests.


## Certificate generation and env variable setup:

Certificate generation:

```
# create key.pem and cert.pem
openssl req -x509 -nodes -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -subj "/CN=dev"

# output sha256 fingerprint of cert.pem (to create the .env 'clientCertificateThumbprint' variable)
openssl x509 -in cert.pem -noout -fingerprint -sha256 | tr -d ":"
```

In Microsoft Entra admin center:

1. Navigate to 'App registrations' on the sidebar
2. Create a 'New registration' with 'Single tenant' account type

In the new app regstration:

1. Navigate to 'API permissions' on the sidebar
2. Grant 'Sites.FullControl.All' to 'SharePoint' and 'Microsoft Graph'
3. Navigate to 'Certificates and secrets' on the sidebar
4. Upload the certificate
5. Navigate to 'Overview' on the sidepanel
6. Copy 'Application (client) ID' to .env 'clientId' variable
7. Copy 'Directory (tenant) ID' to the .env 'tenantId' variable

Fill in the remaining environment variables:

1. 'tenantName' is the {tenantName}.sharepoint.com that will create the temp integration test site
2. 'tempSiteOwner' is the email of a user on that Sharepoint tenant that will be used as site owner
