import {getToken} from "./auth";
import "dotenv/config";
import { XMLHttpRequest } from "xhr2"
import * as rest from '../src/utils/rest';
import {IRequestBody, IRestOptions} from "../src";
import { DOMParser, DOMImplementation, XMLSerializer } from "xmldom";


declare module "mocha" {
    interface Context {
        siteUrl: string;
    }
}

async function beforeAll() {

    const token = await getToken();

    this.siteUrl = 'https://2fb71g.sharepoint.com/sites/kwiz_common_integration_tests_2025-05-27T18-26-12.261Z';
    // this.siteUrl = await createTempSite(token);

    const u = new URL(this.siteUrl);
    (global as any).window = {
        location: {
            protocol: u.protocol,   // "https:"
            host:     u.host,       // "2fb71g.sharepoint.com"
            origin:   u.origin,     // "https://2fb71g.sharepoint.com"
            pathname: u.pathname,   // "/sites/kwiz_common_integration_tests_…"
            search:   u.search,     // likely ""
            hash:     u.hash,       // likely ""
            href:     u.href,       // full URL back
        },
    };

    global.DOMParser = DOMParser;

    // @ts-ignore
    global.Document = function() {
        // ignore any args — you always want a fresh empty XML document
        return new DOMImplementation().createDocument(null, null, null);
    };

    // patch since xmldom does not have outerHTML property
    // 1. create a serializer once
    const serializer = new XMLSerializer();

    // 2. grab an xmldom Document so we can get its Element prototype
    const doc = new DOMImplementation().createDocument(null, null, null);
    const ElementProto = Object.getPrototypeOf(doc.createElement("dummy"));

    // 3. define outerHTML on that prototype
    Object.defineProperty(ElementProto, "outerHTML", {
        get() {
            // serializes `this` <Element> (and its children) back to XML
            return serializer.serializeToString(this);
        },
        configurable: true
    });

    patchXHR();

    patchGetJson(token);
}


async function createTempSite(token: string) {
    const date = new Date().toISOString();
    const dateUriSafe = date.replace(/:/g, "-")
    const request = {
        Title: `kwiz/common [integration tests] [${date}]`,
        Url:`https://${process.env.tenantName}.sharepoint.com/sites/kwiz_common_integration_tests_${dateUriSafe}`,
        Description:"Generated as a sandbox while running @kwiz/common integration tests.",
        WebTemplate:"SITEPAGEPUBLISHING#0",                                                  // communication site
        SiteDesignId:"f6cc5403-0d63-442e-96c0-285923709ffc",                                 // blank
        Owner:process.env.tempSiteOwner,
    };
    const response = await fetch(
        `https://${process.env.tenantName}.sharepoint.com/_api/SPSiteManager/create`,
        {
            method: 'POST',
            body: JSON.stringify({ request }),
            headers: {
                Authorization: `Bearer ${token}`,
                Accept:         "application/json;odata.metadata=none",
                "Content-Type": "application/json;odata.metadata=none",
                "OData-Version":    "4.0",
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
    return payload.SiteUrl
}

function patchXHR(token?: string) {

    global.XMLHttpRequest = XMLHttpRequest;
    const proto = XMLHttpRequest.prototype;

    const originalOpen = proto.open;
    proto.open = function(method: string, url: string, ...args: any[]) {
        // if no protocol (“http:”, “https:”, etc), assume relative
        if (!/^[a-z][a-z\d+\-.]*:/.test(url)) {
            url = new URL(url, window.location.origin).href;
        }
        return originalOpen.apply(this, [method, url, ...args]);
    }

    if (token) {
        const originalSend = proto.send;
        proto.send = function(body?: any) {
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

export const mochaHooks = { beforeAll };
