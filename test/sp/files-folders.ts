import assert from "assert";

import {
    BaseTypes,
    CreateList,
    ListTemplateTypes,
    UploadFile,
    GetFile,
    GetFileEx,
    MoveFile,
    CopyFile,
    DeleteFile,
    RecycleFile,
    EnsureFolder,
    EnsureFolderPath,
    GetFolderFiles,
    DeleteFolder,
    GetListRootFolder
} from "../../src";

async function genericCreateDocLib(siteUrl: string, title: string) {
    const info = {
        title,
        description: "test document library",
        type: BaseTypes.DocumentLibrary,
        template: ListTemplateTypes.DocumentLibrary,
    };
    return await CreateList(siteUrl, info);
}

describe("Files and Folders", function () {

    let listId: string;
    let rootFolderUrl: string;

    before(async function () {
        ({ Id: listId } = await genericCreateDocLib(this.siteUrl, `TestDocLib_${Date.now()}`));
        assert.ok(listId, "List ID should be defined after creating the document library");
        ({ ServerRelativeUrl: rootFolderUrl } = await GetListRootFolder(this.siteUrl, listId));
        assert.ok(rootFolderUrl, "Root folder URL should be defined");
    });

    describe("UploadFile", function () {
        const fileName = `upload-test-${Date.now()}.txt`;
        const fileContent = 'This is content for UploadFile test.';
        let fileUrl: string;

        specify("uploads a new file", async function () {
            const uploadResult = await UploadFile(this.siteUrl, rootFolderUrl, fileName, fileContent as any);
            assert.ok(uploadResult.Exists, "UploadFile should return Exists: true");
            assert.ok(uploadResult.ServerRelativeUrl, "UploadFile should return a ServerRelativeUrl");
            fileUrl = uploadResult.ServerRelativeUrl;
        });

        specify("verifies the uploaded file can be retrieved", async function () {
            const file = await GetFile<string>(this.siteUrl, fileUrl);
            assert.strictEqual(file.Content, fileContent, "File content should match the uploaded content");
        });
    });

    describe("GetFile", function () {
        const fileName = `getfile-test-${Date.now()}.txt`;
        const fileContent = 'getfile content';
        let fileUrl: string;

        before(async function () {
            const uploadResult = await UploadFile(this.siteUrl, rootFolderUrl, fileName, fileContent as any);
            fileUrl = uploadResult.ServerRelativeUrl!;
        });

        specify("gets an existing file's content and metadata", async function () {
            const fileResult = await GetFile<string>(this.siteUrl, fileUrl);
            assert.ok(fileResult.Exists, "File should exist");
            assert.strictEqual(fileResult.Content, fileContent, "File content should match");
        });
    });

    describe("GetFileEx", function () {
        const fileName = `getfileex-test-${Date.now()}.txt`;
        const fileContent = 'getfileex content';
        let fileUrl: string;

        before(async function () {
            const uploadResult = await UploadFile(this.siteUrl, rootFolderUrl, fileName, fileContent as any);
            fileUrl = uploadResult.ServerRelativeUrl!;
        });

        specify("gets an existing file's content and metadata using extended options", async function () {
            const fileExResult = await GetFileEx<string>(this.siteUrl, fileUrl);
            assert.ok(fileExResult.Exists, "File should exist");
            assert.strictEqual(fileExResult.Content, fileContent, "File content should match");
        });
    });

    describe("CopyFile", function () {
        const sourceFileName = `copy-source-${Date.now()}.txt`;
        const targetFileName = `copy-target-${Date.now()}.txt`;
        let sourceFileUrl: string;
        let targetFileUrl: string;

        before(async function () {
            const uploadResult = await UploadFile(this.siteUrl, rootFolderUrl, sourceFileName, "copy content" as any);
            sourceFileUrl = uploadResult.ServerRelativeUrl!;
            targetFileUrl = `${rootFolderUrl}/${targetFileName}`;
        });

        specify("copies a file to a new destination", async function () {
            const success = await CopyFile(this.siteUrl, sourceFileUrl, targetFileUrl);
            assert.ok(success, "CopyFile should return true on success");
        });

        specify("verifies both source and target files exist after copy", async function () {
            const sourceFile = await GetFile(this.siteUrl, sourceFileUrl);
            const targetFile = await GetFile(this.siteUrl, targetFileUrl);
            assert.ok(sourceFile.Exists, "Source file should still exist after copy");
            assert.ok(targetFile.Exists, "Target file should exist after copy");
        });
    });

    describe("MoveFile", function () {
        const sourceFileName = `move-source-${Date.now()}.txt`;
        const targetFileName = `move-target-${Date.now()}.txt`;
        let sourceFileUrl: string;
        let targetFileUrl: string;

        before(async function () {
            const uploadResult = await UploadFile(this.siteUrl, rootFolderUrl, sourceFileName, "move content" as any);
            sourceFileUrl = uploadResult.ServerRelativeUrl!;
            targetFileUrl = `${rootFolderUrl}/${targetFileName}`;
        });

        specify("moves a file to a new destination", async function () {
            const success = await MoveFile(this.siteUrl, sourceFileUrl, targetFileUrl);
            assert.ok(success, "MoveFile should return true on success");
        });

        specify("verifies source is removed and target exists after move", async function () {
            const sourceFile = await GetFile(this.siteUrl, sourceFileUrl);
            const targetFile = await GetFile(this.siteUrl, targetFileUrl);
            assert.strictEqual(sourceFile.Exists, false, "Source file should not exist after move");
            assert.ok(targetFile.Exists, "Target file should exist after move");
        });
    });

    describe("RecycleFile", function () {
        const fileName = `recycle-test-${Date.now()}.txt`;
        let fileUrl: string;

        before(async function () {
            const uploadResult = await UploadFile(this.siteUrl, rootFolderUrl, fileName, "recycle me" as any);
            fileUrl = uploadResult.ServerRelativeUrl!;
        });

        specify("recycles an existing file", async function () {
            const recycled = await RecycleFile(this.siteUrl, fileUrl);
            assert.ok(recycled, "RecycleFile should return true");
        });

        specify("verifies the file is gone after recycling", async function () {
            const fileResult = await GetFile(this.siteUrl, fileUrl);
            assert.strictEqual(fileResult.Exists, false, "File should not exist after being recycled");
        });
    });

    describe("DeleteFile", function () {
        const fileName = `delete-test-${Date.now()}.txt`;
        let fileUrl: string;

        before(async function () {
            const uploadResult = await UploadFile(this.siteUrl, rootFolderUrl, fileName, "delete me" as any);
            fileUrl = uploadResult.ServerRelativeUrl!;
        });

        specify("deletes an existing file", async function () {
            const deleted = await DeleteFile(this.siteUrl, fileUrl);
            assert.ok(deleted, "DeleteFile should return true");
        });

        specify("verifies the file is gone after deletion", async function () {
            const fileResult = await GetFile(this.siteUrl, fileUrl);
            assert.strictEqual(fileResult.Exists, false, "File should not exist after permanent deletion");
        });
    });

    describe("EnsureFolder", function () {
        const folderName = `ensure-folder-${Date.now()}`;
        let folderUrl: string;

        specify("ensures a new folder is created", async function () {
            const result = await EnsureFolder(this.siteUrl, rootFolderUrl, folderName);
            assert.ok(result.Exists, "EnsureFolder should confirm the folder exists");
            assert.ok(result.ServerRelativeUrl, "EnsureFolder should return a ServerRelativeUrl");
            assert.ok(result.ServerRelativeUrl.endsWith(folderName), "ServerRelativeUrl should be correct");
            folderUrl = result.ServerRelativeUrl;
        });

        specify("verifies the folder exists by getting its content", async function () {
            const files = await GetFolderFiles(this.siteUrl, folderUrl);
            assert.ok(Array.isArray(files), "GetFolderFiles should return an array for an existing folder");
        });
    });

    describe("GetFolderFiles", function () {
        const folderName = `getfiles-folder-${Date.now()}`;
        const fileName = 'file-in-folder.txt';
        let folderUrl: string;

        before(async function () {
            const folder = await EnsureFolder(this.siteUrl, rootFolderUrl, folderName);
            folderUrl = folder.ServerRelativeUrl!;
            await UploadFile(this.siteUrl, folderUrl, fileName, "content" as any);
        });

        specify("gets files from a non-empty folder", async function () {
            const files = await GetFolderFiles(this.siteUrl, folderUrl);
            assert.strictEqual(files.length, 1, "Folder should contain exactly one file");
            assert.strictEqual(files[0].Name, fileName, "The name of the file in the folder should match");
        });
    });

    describe("DeleteFolder", function () {
        const folderName = `delete-folder-${Date.now()}`;
        let folderUrl: string;

        before(async function () {
            const folder = await EnsureFolder(this.siteUrl, rootFolderUrl, folderName);
            folderUrl = folder.ServerRelativeUrl!;
        });

        specify("deletes an existing folder", async function () {
            const success = await DeleteFolder(this.siteUrl, folderUrl);
            assert.ok(success, "DeleteFolder should return true for success");
        });

        specify("verifies the folder is gone", async function () {
            const files = await GetFolderFiles(this.siteUrl, folderUrl);
            assert.strictEqual(files.length, 0, "Getting files from a deleted folder should return an empty array");
        });
    });

    describe("EnsureFolderPath", function () {
        let deepFolderPath: string;

        before(function () {
            deepFolderPath = `${rootFolderUrl}/L1/L2/L3_${Date.now()}`;
        });

        specify("creates a nested folder structure", async function () {
            const success = await EnsureFolderPath(this.siteUrl, deepFolderPath);
            assert.ok(success, "EnsureFolderPath should return true upon successful creation");
        });

        specify("verifies the nested folder exists", async function () {
            const files = await GetFolderFiles(this.siteUrl, deepFolderPath);
            assert.ok(Array.isArray(files), "Should be able to get files from the newly created nested folder");
        });
    });
});