import assert from "assert";

import { genericCreateField, genericCreateList } from "./lists";

import {
    AddItem,
    GetListItemFieldDisplayValue,
    GetListItemFieldValues,
    UpdateItem,
    RecycleListItem,
    DeleteListItem,
    GetListItemsByCaml,
    GetItemsById,
    GetListItemFieldValue,
    GetListItemFieldValuesHistory,
    AddAttachment,
    GetListItemAttachments,
    DeleteAttachment,
} from "../../src";

function createCamlQueryById(itemId: number): string {
    return `<Where><Eq><FieldRef Name='ID'/><Value Type='Number'>${itemId}</Value></Eq></Where>`;
}

function createCamlQueryByTitle(itemTitle: string): string {
    return `<Where><Eq><FieldRef Name='Title'/><Value Type='Text'>${itemTitle}</Value></Eq></Where>`;
}

async function genericCreateItem(siteUrl: string, listId: string, title: string) {
    const itemData = { Title: title };
    return await AddItem(siteUrl, listId, itemData);
}

describe("List Items", function () {

    let listId: string, listTitle: string;
    let fieldId: string, fieldTitle: string, fieldInternalName: string;
    const columns = ['Title', 'ID', 'Id', 'FileLeafRef', 'FileDirRef', 'FileRef', 'FileSystemObjectType'];

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
        ({ Id: fieldId, Title: fieldTitle, InternalName: fieldInternalName } = await genericCreateField(this.siteUrl, listId, `TestField_${Date.now()}`));
    });

    describe("AddItem", function () {

        let itemId: number, itemTitle: string;

        specify("add generic item", async function () {
            let success: boolean, errorMessage: string | undefined;
            itemTitle = `TestItem_${Date.now()}`;
            ({ success, errorMessage, itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));

            assert.ok(success, "'AddItem' should be true");
            assert.strictEqual(errorMessage, null, "'errorMessage' should be null");
            assert.ok(itemId, "'itemId' should be valid");
        });

        specify("verify item by Id", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listId, createCamlQueryById(itemId), { columns: columns });
            assert.strictEqual(result.length, 1, "GetListItemsByCaml should return one item");
            assert.strictEqual(result[0].Id, itemId, "'Id' should match expected id");
            assert.strictEqual(result[0].Title, itemTitle, "'Title' should match expected title");
        });

        specify("verify list by Title", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listTitle, createCamlQueryByTitle(itemTitle), { columns: columns });
            assert.strictEqual(result.length, 1, "GetListItemsByCaml should return one item");
            assert.strictEqual(result[0].Id, itemId, "'Id' should match expected id");
            assert.strictEqual(result[0].Title, itemTitle, "'Title' should match expected title");
        });

    });

    describe("GetItemsById", function () {

        let itemId: number, itemTitle: string;

        before(async function () {
            itemTitle = `TestItem_${Date.now()}`;
            ({ itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));
        });

        specify("get item by Id", async function () {
            const result = await GetItemsById(this.siteUrl, listId, [itemId]);
            assert.strictEqual(result.filter(x => true).length, 1, "GetItemsById should return one item");
            assert.strictEqual(result[itemId].Id, itemId, "'Id' should match expected id");
            assert.strictEqual(result[itemId].Title, itemTitle, "'Title' should match expected title");
        });
    });

    describe("GetListItemsByCaml", function () {

        let itemId: number, itemTitle: string;

        before(async function () {
            itemTitle = `TestItem_${Date.now()}`;
            ({ itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));
        });

        specify("get item by Id", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listId, createCamlQueryById(itemId), { columns: columns });
            assert.strictEqual(result.length, 1, "GetListItemsByCaml should return one item");
            assert.strictEqual(result[0].Id, itemId, "'Id' should match expected id");
            assert.strictEqual(result[0].Title, itemTitle, "'Title' should match expected title");
        });

        specify("get item by Title", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listTitle, createCamlQueryByTitle(itemTitle), { columns: columns });
            assert.strictEqual(result.length, 1, "GetListItemsByCaml should return one item");
            assert.strictEqual(result[0].Id, itemId, "'Id' should match expected id");
            assert.strictEqual(result[0].Title, itemTitle, "'Title' should match expected title");
        });
    });

    describe("DeleteItem by Id", function () {

        let itemId: number, itemTitle: string;

        before(async function () {
            itemTitle = `TestItem_${Date.now()}`;
            ({ itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));
        });

        specify("delete item by Id", async function () {
            const { deleted, errorMessage } = await DeleteListItem(this.siteUrl, listId, itemId);
            assert.ok(deleted, "'deleted' should be true");
        });

        specify("verify delete by Id", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listId, createCamlQueryById(itemId), { columns: columns });
            assert.strictEqual(result.length, 0, "GetListItemsByCaml should return no items after deletion");
        });

        specify("verify by Title", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listTitle, createCamlQueryByTitle(itemTitle), { columns: columns });
            assert.strictEqual(result.length, 0, "GetListItemsByCaml should return no items after deletion");
        });
    });

    describe("RecycleItem by Id", function () {

        let itemId: number, itemTitle: string;

        before(async function () {
            itemTitle = `TestItem_${Date.now()}`;
            ({ itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));
        });

        specify("recycle item by Id", async function () {
            const { recycled, errorMessage } = await RecycleListItem(this.siteUrl, listId, itemId);
            assert.ok(recycled, "'recycled' should be true");
            assert.strictEqual(errorMessage, undefined, "'errorMessage' should be undefined");
        });

        specify("verify recycle by Id", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listId, createCamlQueryById(itemId), { columns: columns });
            assert.strictEqual(result.length, 0, "GetListItemsByCaml should return no items after recycling");
        });

        specify("verify recycle by Title", async function () {
            const result = await GetListItemsByCaml(this.siteUrl, listTitle, createCamlQueryByTitle(itemTitle), { columns: columns });
            assert.strictEqual(result.length, 0, "GetListItemsByCaml should return no items after recycling");
        });
    });

    describe("UpdateItem", function () {

        let itemId: number, itemTitle: string;

        before(async function () {
            itemTitle = `TestItem_${Date.now()}`;
            ({ itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));
        });

        const updatedTitle = `UpdatedTitle_${Date.now()}`;

        specify("update Title field value", async function () {
            const result = await UpdateItem(this.siteUrl, listId, itemId, { Title: updatedTitle });
            assert.strictEqual(result.success, true, "UpdateItem should report success");
            assert.strictEqual(result.itemId, itemId, "UpdateItem should return the correct item ID");
        });

        specify("verify by Id", async function () {
            const values = await GetListItemFieldValues(this.siteUrl, listId, itemId, ["Title"]);
            assert.strictEqual(values.Title, updatedTitle, "Title should match the updated value");
        });
    });




    describe("GetListItemField...", function () {

        let itemId: number, itemTitle: string, itemFieldValue: string;

        before(async function () {
            itemTitle = `TestItem_${Date.now()}`;
            ({ itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));
            itemFieldValue = `TestValue_${Date.now()}`;
            await UpdateItem(this.siteUrl, listId, itemId, { [fieldInternalName]: itemFieldValue });
        });

        describe("GetListItemFieldValue", function () {
            specify("get Title field value", async function () {
                const value = await GetListItemFieldValue(this.siteUrl, listId, itemId, "Title");
                assert.strictEqual(value, itemTitle, "returned value should match title");
            });
            specify("get custom field value", async function () {
                const value = await GetListItemFieldValue(this.siteUrl, listId, itemId, fieldInternalName);
                assert.strictEqual(value, itemFieldValue, "returned field value should match custom field value");
            });
        });

        describe("GetListItemFieldValues", function () {
            specify("get Title field value and custom field value", async function () {
                const values = await GetListItemFieldValues(this.siteUrl, listId, itemId, ["Title", "ID", fieldInternalName]);
                assert.ok(values, "should return values");
                assert.strictEqual(values.Title, itemTitle, "Title value should be correct");
                assert.strictEqual(values.ID, itemId, "ID value should be correct");
                assert.strictEqual(values[fieldInternalName], itemFieldValue, "Custom field value should be correct");
            });
        });

        describe("GetListItemFieldDisplayValue", function () {
            specify("get Title field display value", async function () {
                const value = await GetListItemFieldDisplayValue(this.siteUrl, listId, itemId, "Title");
                assert.strictEqual(value, itemTitle, "returned value should match title");
            });
            specify("get custom field display value", async function () {
                const value = await GetListItemFieldDisplayValue(this.siteUrl, listId, itemId, fieldInternalName);
                assert.strictEqual(value, itemFieldValue, "returned field value should match custom field value");
            });
        });

        describe("GetListItemFieldDisplayValues", function () {
            specify("get Title field display value and custom field display value", async function () {
                const values = await GetListItemFieldValues(this.siteUrl, listId, itemId, ["Title", "ID", fieldInternalName]);
                assert.ok(values, "should return values");
                assert.strictEqual(values.Title, itemTitle, "Title value should be correct");
                assert.strictEqual(values.ID, itemId, "ID value should be correct");
                assert.strictEqual(values[fieldInternalName], itemFieldValue, "custom field value should be correct");
            });
        });

        describe("GetListItemFieldValueHistory", function () {
            specify("get Title field history and custom field history", async function () {
                const history = await GetListItemFieldValuesHistory(this.siteUrl, listId, itemId, ["Title", fieldInternalName]);
                assert.ok(history, "should return history");
                assert.strictEqual(history.length, 2, "should have two versions");
                assert.strictEqual(history[1].Title, itemTitle, "first Title is correct");
                assert.strictEqual(history[1][fieldInternalName.replace(/_/g, '_x005f_')], null, "first custom field value is null");
                assert.strictEqual(history[0].Title, itemTitle, "second Title is correct");
                assert.strictEqual(history[0][fieldInternalName.replace(/_/g, '_x005f_')], itemFieldValue, "second custom field value is correct");
            });
        });
    });

    describe("Attachments", function () {

        let itemId: number;
        const itemTitle = `Item_With_Attachments_${Date.now()}`;
        const attachmentFileName = "test-attachment.txt";
        const attachmentContent = "This is the content of the attachment.";

        before(async function () {
            ({ itemId } = await genericCreateItem(this.siteUrl, listId, itemTitle));
        });

        specify("AddAttachment should add a file to the list item", async function () {
            const result = await AddAttachment(this.siteUrl, listId, itemId, attachmentFileName, attachmentContent as any);

            assert.ok(result, "AddAttachment should return a result object");
            assert.strictEqual(result.FileName, attachmentFileName, "Attached file name should match");
            assert.ok(result.ServerRelativeUrl.endsWith(attachmentFileName), "ServerRelativeUrl should end with the file name");
        });

        specify("GetListItemAttachments should retrieve the added attachment", async function () {
            const attachments = await GetListItemAttachments(this.siteUrl, listId, itemId);
            assert.ok(Array.isArray(attachments), "GetListItemAttachments should return an array");
            assert.strictEqual(attachments.length, 1, "There should be exactly one attachment");
            assert.strictEqual(attachments[0].FileName, attachmentFileName, "The retrieved attachment's FileName should match");
        });

        specify("DeleteAttachment should remove the file from the list item", async function () {
            const result = await DeleteAttachment(this.siteUrl, listId, itemId, attachmentFileName);
            assert.ok(result.deleted, "'deleted' should be true");
        });

        specify("GetListItemAttachments should confirm the attachment is deleted", async function () {
            const attachments = await GetListItemAttachments(this.siteUrl, listId, itemId);
            assert.strictEqual(attachments.length, 0, "There should be no attachments after deletion");
        });
    });
});