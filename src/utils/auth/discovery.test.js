import assert from 'assert/strict';
import test from 'node:test';
import { normalizeGuid } from '../../helpers/strings';
import { isValidGuid } from '../../helpers/typecheckers';
import { DiscoverTenantInfo } from './discovery';

test('DiscoverTenantInfo', async t => {
    t.test("Skipping DiscoverTenantInfo", t => true);
    global.XMLHttpRequest = require('xhr2');
    let info = await DiscoverTenantInfo("kwizcomdev.sharepoint.com");
    await t.test("response not null/undefined", t => assert.notDeepEqual(info, null) && assert.notDeepEqual(info, undefined));
    await t.test("has valid guid", t => assert.deepEqual(isValidGuid(info && info.idOrName), true));
    await t.test("has correct guid", t => assert.deepEqual(normalizeGuid(info && info.idOrName), normalizeGuid("3bf37eb8-6c20-45a9-aff6-ac72d276f375")));
});