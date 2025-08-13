import assert from "assert";
import {
    GetSiteId,
    GetWebId,
    GetWebTitle,
    GetAllSubWebs,
    IsRootWeb,
    isValidGuid,
    normalizeGuid,
    IWebBasicInfo
} from "../../src";

describe("Web", function () {

    specify("GetSiteId", async function () {
        const siteId = await GetSiteId(this.siteUrl);
        assert.ok(siteId, "Site ID should be defined");
        assert.ok(isValidGuid(siteId), "Site ID should be a valid GUID");
        assert.strictEqual(siteId, this.siteId, "Site ID should match the ID of the test site");
    });

    specify("GetWebId", async function () {
        const webId = await GetWebId(this.siteUrl);
        assert.strictEqual(typeof webId, "string", "Web ID should be a string");
        assert.ok(isValidGuid(webId), "Web ID should be a valid GUID");
    });

    specify("GetWebTitle", async function () {
        const title = await GetWebTitle(this.siteUrl);
        assert.strictEqual(typeof title, "string", "Web title should be a string");
        assert.ok(title.includes("kwiz/common [integration tests]"), "Web title should match the expected format for the test site");
    });

    specify("GetAllSubWebs", async function () {
        const subWebs: IWebBasicInfo[] = await GetAllSubWebs(this.siteUrl);
        assert.ok(Array.isArray(subWebs), "Result should be an array");
    });

    specify("IsRootWeb", async function () {
        const isRoot = await IsRootWeb(this.siteUrl);
        assert.ok(typeof isRoot === "boolean", "IsRootWeb should return a boolean value");
    });
});