import { getToken } from "./auth";
import "dotenv/config";
import XMLHttpRequest from "xhr2"
import * as rest from '../src/utils/rest';
import { GetSiteId } from '../src/utils/sharepoint.rest/web';
import { IRequestBody, IRestOptions } from "../src";
import { DOMParser, DOMImplementation, XMLSerializer } from "xmldom";
import assert from "assert";

declare module "mocha" {
    interface Context {
        token: string;
        siteUrl: string;
        siteId: string;
        deleteTempSite: boolean;
    }
}

async function beforeAll() {

    this.token = await getToken();
    assert(this.token, "must get token");

    patchXHR();
    patchGetJson(this.token);

    patchDOM();

    if (!process.env.tempSiteOwner && process.env.tempSiteUrl) {
        // use the given site url and do not delete it after tests
        patchWindow(process.env.tempSiteUrl);
        this.siteUrl = process.env.tempSiteUrl;
        this.siteId = await GetSiteId(this.siteUrl);
        this.deleteTempSite = false;
        console.log(`Using existing site: ${this.siteUrl}\n`);

    } else if (process.env.tempSiteOwner && !process.env.tempSiteUrl) {
        // create a new site and delete it after tests
        const tempSite = await createTempSite(this.token);
        this.siteUrl = tempSite.SiteUrl;
        this.siteId = tempSite.SiteId;
        this.deleteTempSite = true;
        patchWindow(this.siteUrl);
        console.log(`Created temporary site: ${this.siteUrl}\n`);

    } else {
        assert.fail("Either tempSiteOwner or tempSiteUrl env variables must be set, but not both.");
    }

    assert(this.siteUrl, "must get siteUrl");
    assert(this.siteId, "must get siteId");
    assert(this.deleteTempSite !== undefined, "must set deleteTempSite");
}

async function afterAll() {
    if (this.deleteTempSite === true) {
        await deleteTempSite(this.token, this.siteId);
        console.log(`Deleted temporary site: ${this.siteUrl}`);
    }
}

async function createTempSite(token: string) {
    const date = new Date().toISOString();
    const dateUriSafe = date.replace(/:/g, "-")
    const request = {
        Title: `kwiz/common [integration tests] [${date}]`,
        Url: `https://${process.env.tenantName}.sharepoint.com/sites/kwiz_common_integration_tests_${dateUriSafe}`,
        Description: "Generated as a sandbox while running @kwiz/common integration tests.",
        WebTemplate: "SITEPAGEPUBLISHING#0",                                                  // communication site
        SiteDesignId: "f6cc5403-0d63-442e-96c0-285923709ffc",                                 // blank
        Owner: process.env.tempSiteOwner,
    };
    const response = await fetch(
        `https://${process.env.tenantName}.sharepoint.com/_api/SPSiteManager/create`,
        {
            method: 'POST',
            body: JSON.stringify({ request }),
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json;odata.metadata=none",
                "OData-Version": "4.0",
            }
        }
    );
    if (!response.ok) {
        throw new Error(`fetch error: ${response.status}`);
    }
    const payload = await response.json();
    if (payload.SiteStatus !== 2) {
        throw new Error(`_api/SPSiteManager/create error: ${payload.SiteStatus}`);
    }

    return payload;
}

async function deleteTempSite(token: string, siteId: string) {
    const response = await fetch(
        `https://${process.env.tenantName}.sharepoint.com/_api/SPSiteManager/delete`,
        {
            method: 'POST',
            body: JSON.stringify({ siteId }),
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json;odata.metadata=none",
                "OData-Version": "4.0",
            }
        }
    );
    if (!response.ok) {
        throw new Error(`fetch error: ${response.status}`);
    }
}

function patchWindow(url: string) {
    const u = new URL(url);
    (global as any).window = {
        location: {
            protocol: u.protocol, // "https:"
            host: u.host,         // "{tenantName}.sharepoint.com"
            origin: u.origin,     // "https://{tenantName}.sharepoint.com"
            pathname: u.pathname, // "/sites/kwiz_common_integration_tests_..."
            href: u.href,         // "https://{tenantName}.sharepoint.com/sites/kwiz_common_integration_tests_..."
        },
    };
}

function patchDOM() {
    global.DOMParser = DOMParser;
    const doc = new DOMImplementation().createDocument(null, null, null);
    function DocumentConstructor() {
        return doc;
    }
    DocumentConstructor.prototype = Object.getPrototypeOf(doc);
    global.Document = DocumentConstructor as any;
    const serializer = new XMLSerializer();
    Object.defineProperty(Object.getPrototypeOf(doc.createElement("dummy")), "outerHTML", {
        get() {
            return serializer.serializeToString(this);
        },
        configurable: true
    });
}

function patchXHR(token?: string) {

    global.XMLHttpRequest = XMLHttpRequest;
    const proto = XMLHttpRequest.prototype;

    const originalOpen = proto.open;
    proto.open = function (method: string, url: string, ...args: any[]) {
        // if no protocol (“http:”, “https:”, etc), assume relative
        if (!/^[a-z][a-z\d+\-.]*:/.test(url)) {
            url = new URL(url, window.location.origin).href;
        }
        return originalOpen.apply(this, [method, url, ...args]);
    }

    if (token) {
        const originalSend = proto.send;
        proto.send = function (body?: any) {
            this.setRequestHeader("Authorization", `Bearer ${token}`);
            return originalSend.apply(this, [body]);
        }
    }
}

function patchGetJson(token: string) {

    const originalGetJson = rest.GetJson;

    (rest as any).GetJson = async function patchedGetJson<T>(
        url: string,
        body?: IRequestBody,
        options?: IRestOptions
    ): Promise<T> {
        const updatedOptions: IRestOptions = {
            ...options,
            headers: {
                ...(options?.headers || {}),
                Authorization: `Bearer ${token}`
            }
        };

        return originalGetJson(url, body, updatedOptions);
    };
}

export const mochaHooks = { beforeAll, afterAll };
