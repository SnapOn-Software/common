import assert from "assert";

import {
    GetUserLoginName,
    GetCurrentUser,
    EnsureUser,
    GetUser,
    IUserInfo
} from "../../src";

describe("Users", function () {

    specify("GetUserLoginName", async function () {
        const loginName = await GetUserLoginName(this.siteUrl);
        assert.strictEqual(typeof loginName, "string", "Login name should be a string");
        assert.ok(loginName.length > 0, "Login name should not be empty");
    });

    specify("GetCurrentUser", async function () {
        const currentUser = await GetCurrentUser(this.siteUrl);
        assert.strictEqual(typeof currentUser.Id, "number", "User ID should be a number");
        assert.ok(currentUser.Id > 0, "User ID should be a positive number");
        assert.strictEqual(typeof currentUser.LoginName, "string", "User LoginName should be a string");
        assert.strictEqual(typeof currentUser.Title, "string", "User Title should be a string");
    });

    describe("GetUser", function () {
        let currentUserId: number;
        let currentUserLogin: string;

        before(async function () {
            ({ Id: currentUserId, LoginName: currentUserLogin } = await GetCurrentUser(this.siteUrl));
        });

        specify("get current user", async function () {
            const retrievedUser = await GetUser(this.siteUrl, currentUserId);
            assert.strictEqual(retrievedUser.Id, currentUserId, "Retrieved user ID should match the requested ID");
            assert.strictEqual(retrievedUser.LoginName, currentUserLogin, "Retrieved user LoginName should match the current user's login name");
        });
    });

    describe("EnsureUser", function () {
        let currentUserLogin: string;
        let currentUserId: number;

        before(async function () {
            ({ LoginName: currentUserLogin, Id: currentUserId } = await GetCurrentUser(this.siteUrl));
        });

        specify("ensures the current user", async function () {
            const ensuredUser = await EnsureUser(this.siteUrl, currentUserLogin);
            assert.strictEqual(ensuredUser.Id, currentUserId, "Ensured user's ID should match the current user's ID");
            assert.strictEqual(ensuredUser.LoginName, currentUserLogin, "Ensured user's login name should match");
        });

    });
});