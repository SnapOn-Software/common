Contents of .env file:

```
tenantName=...
tenantId=...
clientId=...
clientCertificateThumbprint=...
clientKeyPath=test/key.pem
tempSiteOwner=...
```

To generate the certificate:

```
openssl req -x509 -nodes -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -subj "/CN=dev"


openssl x509 -in cert.pem -noout -fingerprint -sha256 | tr -d ":"

```
