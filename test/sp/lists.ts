import assert from "assert";

import {
    AddViewFieldToListView,
    BaseTypes,
    ChangeDatetimeFieldMode,
    ChangeTextFieldMode,
    CreateField,
    CreateList,
    DeleteField,
    DeleteList,
    FieldTypes,
    FindListItemById,
    GetFieldSchema, GetList,
    GetListContentTypes,
    GetListField,
    GetListFields,
    GetListFieldsAsHash,
    GetListFormUrl,
    GetListItems,
    GetListLastItemModifiedDate,
    GetListName,
    GetListRootFolder,
    GetLists,
    GetListTitle,
    GetListViews,
    IFieldInfoEX,
    ListTemplateTypes,
    PageType,
    RecycleList,
    RemoveViewFieldFromListView,
    UpdateField,
} from "../../src";

export async function genericCreateList(siteUrl: string, title: string) {
    const info = {
        title,
        description: "test list",
        type: BaseTypes.GenericList,
        template: ListTemplateTypes.GenericList,
    };
    return await CreateList(siteUrl, info);
}

export async function genericCreateField(siteUrl: string, listId: string, title: string) {
    const info = {
        Title: title,
        Type: FieldTypes.Text,
        AwaitAddToDefaultView: true,
    }
    return await CreateField(siteUrl, listId, info);
}

describe("CreateList", function () {

    let listId: string, listTitle: string;

    specify("create generic list", async function () {
        const inputTitle = `TestList_${Date.now()}`;
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, inputTitle));

        assert.strictEqual(typeof listId, "string", "'Id' should be a string");
        assert.notStrictEqual(listId.length, 0, "'Id' should not be empty");
        assert.strictEqual(listTitle, inputTitle, "'Title' should match input title");
    });

    specify("verify list by Id", async function () {
        const result = await GetList(this.siteUrl, listId);
        assert.strictEqual(result.Id, listId, "'Id' should match expected id");
        assert.strictEqual(result.Title, listTitle, "'Title' should match expected title");
    });

    specify("verify list by Title", async function () {
        const result = await GetList(this.siteUrl, listTitle);
        assert.strictEqual(result.Id, listId, "'Id' should match expected id");
        assert.strictEqual(result.Title, listTitle, "'Title' should match expected title");
    });
});

describe("GetList", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list by Id", async function () {
        const result = await GetList(this.siteUrl, listId);
        assert.strictEqual(result.Id, listId, "'Id' should match expected id");
        assert.strictEqual(result.Title, listTitle, "'Title' should match expected title");
    });

    specify("get list by Title", async function () {
        const result = await GetList(this.siteUrl, listTitle);
        assert.strictEqual(result.Id, listId, "'Id' should match expected id");
        assert.strictEqual(result.Title, listTitle, "'Title' should match expected title");
    });
});

describe("GetLists", function () {

    let listId1: string, listTitle1: string;
    let listId2: string, listTitle2: string;

    before(async function () {
        ({ Id: listId1, Title: listTitle1 } = await genericCreateList(this.siteUrl, `TestList1_${Date.now()}`));
        ({ Id: listId2, Title: listTitle2 } = await genericCreateList(this.siteUrl, `TestList2_${Date.now()}`));
    });

    specify("get all lists", async function () {
        const allLists = await GetLists(this.siteUrl);
        assert.ok(Array.isArray(allLists), "Result should be an array");
        assert.ok(allLists.length >= 2, "Should retrieve at least the two created lists");
        const foundList1 = allLists.find(l => l.Id === listId1);
        const foundList2 = allLists.find(l => l.Id === listId2);

        assert.ok(foundList1, "Should find the first created list by its ID");
        assert.strictEqual(foundList1.Title, listTitle1, "Title of the first list should match");

        assert.ok(foundList2, "Should find the second created list by its ID");
        assert.strictEqual(foundList2.Title, listTitle2, "Title of the second list should match");
    });
});

describe("DeleteList by Id", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("delete list by Id", async function () {
        const result = await DeleteList(this.siteUrl, listId);
        assert.strictEqual(result.deleted, true, "'deleted' should be true");
    });

    specify("verify delete by Id", async function () {
        const result = await GetList(this.siteUrl, listId);
        assert.strictEqual(result, null, "result should be null");
    });

    specify("verify delete by Title", async function () {
        const result = await GetList(this.siteUrl, listTitle);
        assert.strictEqual(result, null, "result should be null");
    });
});

describe("DeleteList by Title", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("delete list by Title", async function () {
        const result = await DeleteList(this.siteUrl, listTitle);
        assert.strictEqual(result.deleted, true, "'deleted' should be true");
    });

    specify("verify delete by Id", async function () {
        const result = await GetList(this.siteUrl, listId);
        assert.strictEqual(result, null, "result should be null");
    });

    specify("verify delete by Title", async function () {
        const result = await GetList(this.siteUrl, listTitle);
        assert.strictEqual(result, null, "result should be null");
    });
});

describe("RecycleList by Id", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("recycle list by Id", async function () {
        const result = await RecycleList(this.siteUrl, listId);
        assert.strictEqual(result.recycled, true, "'recycled' should be true");
    });

    specify("verify recycle by Id", async function () {
        const result = await GetList(this.siteUrl, listId);
        assert.strictEqual(result, null, "result should be null");
    });

    specify("verify recycle by Title", async function () {
        const result = await GetList(this.siteUrl, listTitle);
        assert.strictEqual(result, null, "result should be null");
    });
});

describe("RecycleList by Title", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("recycle list by Title", async function () {
        const result = await RecycleList(this.siteUrl, listTitle);
        assert.strictEqual(result.recycled, true, "'recycled' should be true");
    });

    specify("verify recycle by Id", async function () {
        const result = await GetList(this.siteUrl, listId);
        assert.strictEqual(result, null, "result should be null");
    });

    specify("verify Recycle by Title", async function () {
        const result = await GetList(this.siteUrl, listTitle);
        assert.strictEqual(result, null, "result should be null");
    });
});

describe("Fields", function () {

    let listId: string;

    before(async function () {
        ({ Id: listId } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    describe("CreateField", function () {

        let fieldId: string, fieldTitle: string, fieldInternalName: string;

        specify("create generic field", async function () {
            const inputTitle = `TestField_${Date.now()}`;
            ({
                Id: fieldId,
                Title: fieldTitle,
                InternalName: fieldInternalName
            } = await genericCreateField(this.siteUrl, listId, inputTitle));

            assert.strictEqual(typeof fieldId, "string", "'Id' should be a string");
            assert.notStrictEqual(fieldId.length, 0, "'Id' should not be empty");
            assert.strictEqual(fieldTitle, inputTitle, "'Title' should match input title");
        })

        specify("verify by Id", async function () {
            const field = await GetListField(this.siteUrl, listId, fieldId);
            assert.strictEqual(field.Id, fieldId, "'Id' should match expected id");
            assert.strictEqual(field.Title, fieldTitle, "'Title' should match expected title");
            assert.strictEqual(field.InternalName, fieldInternalName, "'InternalName' should match expected internal name");
        })

        specify("verify by Title", async function () {
            const field = await GetListField(this.siteUrl, listId, fieldTitle);
            assert.strictEqual(field.Id, fieldId, "'Id' should match expected id");
            assert.strictEqual(field.Title, fieldTitle, "'Title' should match expected title");
            assert.strictEqual(field.InternalName, fieldInternalName, "'InternalName' should match expected internal name");
        })
    })

    describe("UpdateField", function () {

        let fieldId: string, fieldTitle: string, fieldInternalName: string;

        before(async function () {
            ({
                Id: fieldId,
                Title: fieldTitle,
                InternalName: fieldInternalName
            } = await genericCreateField(this.siteUrl, listId, `TestField_${Date.now()}`));
        })

        let newTitle: string;

        specify("update field title", async function () {
            newTitle = `${fieldTitle}_Updated`;
            const updated = await UpdateField(this.siteUrl, listId, fieldInternalName, { Title: newTitle });
            assert.strictEqual(updated.Title, newTitle, "Field title should be updated");
        });

        specify("verify by Id", async function () {
            const field = await GetListField(this.siteUrl, listId, fieldId);
            assert.strictEqual(field.Id, fieldId, "'Id' should match expected id");
            assert.strictEqual(field.Title, newTitle, "'Title' should match expected title");
            assert.strictEqual(field.InternalName, fieldInternalName, "'InternalName' should match expected internal name");
        })

        specify("verify by Title", async function () {
            const field = await GetListField(this.siteUrl, listId, newTitle);
            assert.strictEqual(field.Id, fieldId, "'Id' should match expected id");
            assert.strictEqual(field.Title, newTitle, "'Title' should match expected title");
            assert.strictEqual(field.InternalName, fieldInternalName, "'InternalName' should match expected internal name");
        })
    })

    describe("ChangeTextFieldMode", function () {

        let field: IFieldInfoEX;

        before(async function () {
            field = await genericCreateField(this.siteUrl, listId, `TestField_${Date.now()}`);
        })

        specify("change to html", async function () {
            const success = await ChangeTextFieldMode(this.siteUrl, listId, "html", field);
            assert.ok(success, "ChangeTextFieldMode should return true");


        });

        specify("verify by InternalName", async function () {
            const schema = await GetFieldSchema(this.siteUrl, listId, field.InternalName);
            assert.ok(schema, "GetFieldSchema should return a schema object");
            assert.strictEqual(schema.Attributes.RichText, "TRUE", "RichText should be 'TRUE'");
            assert.strictEqual(schema.Attributes.RichTextMode, "FullHTML", "RichTextMode should be 'FullHTML'");
        })
    })

    describe("GetListFields", function () {

        let fieldId1: string, fieldTitle1: string, fieldInternalName1: string;
        let fieldId2: string, fieldTitle2: string, fieldInternalName2: string;

        before(async function () {
            ({
                Id: fieldId1,
                Title: fieldTitle1,
                InternalName: fieldInternalName1
            } = await genericCreateField(this.siteUrl, listId, `TestField_${Date.now()}`));
            ({
                Id: fieldId2,
                Title: fieldTitle2,
                InternalName: fieldInternalName2
            } = await genericCreateField(this.siteUrl, listId, `TestField_${Date.now()}`));
        })

        specify("GetListFields returns created fields", async function () {
            const fields = await GetListFields(this.siteUrl, listId);
            assert.ok(fields.some(f => f.Id === fieldId1), "Fields should include the first created field");
            assert.ok(fields.some(f => f.Id === fieldId2), "Fields should include the second created field");
        });


        specify("GetListFieldsAsHash returns a hash including the created field", async function () {
            const hash = await GetListFieldsAsHash(this.siteUrl, listId);
            assert.strictEqual(hash[fieldInternalName1].InternalName, fieldInternalName1, "first hash entry 'InternalName' should match");
            assert.strictEqual(hash[fieldInternalName2].InternalName, fieldInternalName2, "second hash entry 'InternalName' should match");
        });
    })

    describe("DeleteField", function () {

        let fieldId: string, fieldTitle: string, fieldInternalName: string;

        before(async function () {
            ({
                Id: fieldId,
                Title: fieldTitle,
                InternalName: fieldInternalName
            } = await genericCreateField(this.siteUrl, listId, `TestField_${Date.now()}`));
        })

        specify("verify by Id", async function () {
            const field = await GetListField(this.siteUrl, listId, fieldId);
            assert.strictEqual(field.Id, fieldId, "'Id' should match expected id");
            assert.strictEqual(field.Title, fieldTitle, "'Title' should match expected title");
            assert.strictEqual(field.InternalName, fieldInternalName, "'InternalName' should match expected internal name");
        })

        specify("verify by Title", async function () {
            const field = await GetListField(this.siteUrl, listId, fieldTitle);
            assert.strictEqual(field.Id, fieldId, "'Id' should match expected id");
            assert.strictEqual(field.Title, fieldTitle, "'Title' should match expected title");
            assert.strictEqual(field.InternalName, fieldInternalName, "'InternalName' should match expected internal name");
        })

        specify("delete field", async function () {
            const deleted = await DeleteField(this.siteUrl, listId, fieldInternalName);
            assert.ok(deleted, "DeleteField should return true");

            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        specify("verify by Id", async function () {
            const field = await GetListField(this.siteUrl, listId, fieldId, true);
            assert.strictEqual(field, null, "field should be null");
        })

        specify("verify by Title", async function () {
            const field = await GetListField(this.siteUrl, listId, fieldTitle, true);
            assert.strictEqual(field, null, "field should be null");
        })
    })
})

describe("GetListTitle", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list title by Id", async function () {
        const result = await GetListTitle(this.siteUrl, listId);
        assert.strictEqual(result, listTitle, "Title should match expected title");
    });

    specify("get list title by Title", async function () {
        const result = await GetListTitle(this.siteUrl, listTitle);
        assert.strictEqual(result, listTitle, "Title should match expected title");
    });
});

describe("GetListName", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list name by Id", async function () {
        const result = await GetListName(this.siteUrl, listId);
        assert.strictEqual(typeof result, "string", "result should be a string");
        assert.notStrictEqual(result.length, 0, "result should not be empty");
    });

    specify("get list name by Title", async function () {
        const result = await GetListName(this.siteUrl, listTitle);
        assert.strictEqual(typeof result, "string", "result should be a string");
        assert.notStrictEqual(result.length, 0, "result should not be empty");
    });
});

describe("GetListRootFolder", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list root folder by Id", async function () {
        const result = await GetListRootFolder(this.siteUrl, listId);
        assert.ok(result, "result should not be null");
        assert.strictEqual(typeof result.ServerRelativeUrl, "string", "ServerRelativeUrl should be a string");
        assert.strictEqual(typeof result.Name, "string", "Name should be a string");
    });

    specify("get list root folder by Title", async function () {
        const result = await GetListRootFolder(this.siteUrl, listTitle);
        assert.ok(result, "result should not be null");
        assert.strictEqual(typeof result.ServerRelativeUrl, "string", "ServerRelativeUrl should be a string");
        assert.strictEqual(typeof result.Name, "string", "Name should be a string");
    });
});


describe("GetListViews", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list views by Id", async function () {
        const views = await GetListViews(this.siteUrl, listId);
        assert.ok(Array.isArray(views), "views should be an array");
        assert.ok(views.length > 0, "views should not be empty");
    });

    specify("get list views by Title", async function () {
        const views = await GetListViews(this.siteUrl, listTitle);
        assert.ok(Array.isArray(views), "views should be an array");
        assert.ok(views.length > 0, "views should not be empty");
    });
});

describe("GetListContentTypes", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list content types by Id", async function () {
        const contentTypes = await GetListContentTypes(this.siteUrl, listId);
        assert.ok(Array.isArray(contentTypes), "contentTypes should be an array");
        assert.ok(contentTypes.length > 0, "contentTypes should not be empty");
    });

    specify("get list content types by Title", async function () {
        const contentTypes = await GetListContentTypes(this.siteUrl, listTitle);
        assert.ok(Array.isArray(contentTypes), "contentTypes should be an array");
        assert.ok(contentTypes.length > 0, "contentTypes should not be empty");
    });
});

describe("GetListFormUrl", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list form url for new item by Id", function () {
        const url = GetListFormUrl(this.siteUrl, listId, PageType.NewForm);
        assert.strictEqual(typeof url, "string", "url should be a string");
        assert.ok(url.includes("listform.aspx"), "url should contain listform.aspx");
        assert.ok(url.includes("PageType=8"), "url should contain PageType=4");
    });

    specify("get list form url for edit item by Id", function () {
        const url = GetListFormUrl(this.siteUrl, listId, PageType.EditForm, { itemId: 1 });
        assert.strictEqual(typeof url, "string", "url should be a string");
        assert.ok(url.includes("listform.aspx"), "url should contain listform.aspx");
        assert.ok(url.includes("PageType=6"), "url should contain PageType=6");
        assert.ok(url.includes("ID=1"), "url should contain ID=1");
    });
});

describe("GetListLastItemModifiedDate", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list last item modified date by Id", async function () {
        const date = await GetListLastItemModifiedDate(this.siteUrl, listId);
        assert.strictEqual(typeof date, "string", "date should be a string");
        assert.ok(date.length > 0, "date should not be empty");
    });

    specify("get list last item modified date by Title", async function () {
        const date = await GetListLastItemModifiedDate(this.siteUrl, listTitle);
        assert.strictEqual(typeof date, "string", "date should be a string");
        assert.ok(date.length > 0, "date should not be empty");
    });
});

describe("ChangeDatetimeFieldMode", function () {

    let listId: string, listTitle: string, field: IFieldInfoEX;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
        field = await genericCreateField(this.siteUrl, listId, `TestField_${Date.now()}`);
    });

    specify("change datetime field mode to include time by Id", async function () {
        const success = await ChangeDatetimeFieldMode(this.siteUrl, listId, true, field);
        assert.ok(success, "ChangeDatetimeFieldMode should return true");
    });

    specify("change datetime field mode to exclude time by Id", async function () {
        const success = await ChangeDatetimeFieldMode(this.siteUrl, listId, false, field);
        assert.ok(success, "ChangeDatetimeFieldMode should return true");
    });

    specify("change datetime field mode to include time by Title", async function () {
        const success = await ChangeDatetimeFieldMode(this.siteUrl, listTitle, true, field);
        assert.ok(success, "ChangeDatetimeFieldMode should return true");
    });

    specify("change datetime field mode to exclude time by Title", async function () {
        const success = await ChangeDatetimeFieldMode(this.siteUrl, listTitle, false, field);
        assert.ok(success, "ChangeDatetimeFieldMode should return true");
    });
});

describe("GetListItems", function () {

    let listId: string, listTitle: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
    });

    specify("get list items by Id", async function () {
        const items = await GetListItems(this.siteUrl, listId, {
            columns: ["Id", "Title"],
            rowLimit: 10
        });
        assert.ok(Array.isArray(items), "items should be an array");
    });

    specify("get list items by Title", async function () {
        const items = await GetListItems(this.siteUrl, listTitle, {
            columns: ["Id", "Title"],
            rowLimit: 10
        });
        assert.ok(Array.isArray(items), "items should be an array");
    });
});

describe("FindListItemById", function () {

    specify("find list item by id in empty array", function () {
        const result = FindListItemById([], 1);
        assert.strictEqual(result, null, "result should be null for empty array");
    });

    specify("find list item by id in array with items", function () {
        const items = [
            { Id: 1, Title: "Item 1", FileRef: "", FileDirRef: "", FileLeafRef: "", FileType: "", FileSystemObjectType: 0, __DisplayTitle: "Item 1" },
            { Id: 2, Title: "Item 2", FileRef: "", FileDirRef: "", FileLeafRef: "", FileType: "", FileSystemObjectType: 0, __DisplayTitle: "Item 2" }
        ];
        const result = FindListItemById(items, 1);
        assert.ok(result, "result should not be null");
        assert.strictEqual(result.Id, 1, "should find correct item");
    });
});

describe("View Field Operations", function () {

    let listId: string, listTitle: string, viewId: string, fieldInternalName: string;

    before(async function () {
        ({ Id: listId, Title: listTitle } = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
        ({ InternalName: fieldInternalName } = await genericCreateField(this.siteUrl, listId, `TestViewField_${Date.now()}`));
        const views = await GetListViews(this.siteUrl, listId, { includeViewFields: true });
        viewId = views[0].Id;
    });

    specify("remove view field from list view by Id", async function () {
        const result = await RemoveViewFieldFromListView(this.siteUrl, listId, viewId, fieldInternalName, true);
        assert.ok(result, "RemoveViewFieldFromListView should return true");
    });

    specify("verify by Title", async function () {
        let views = await GetListViews(this.siteUrl, listTitle, { includeViewFields: true }, true);
        const view = views.find(v => v.Id === viewId);
        assert.ok(!view?.ViewFields?.includes(fieldInternalName), "Field should be removed from view");
    });

    specify("add view field to list view by Id", async function () {
        const result = await AddViewFieldToListView(this.siteUrl, listId, viewId, fieldInternalName, true);
        assert.ok(result, "AddViewFieldToListView should return true");
    });

    specify("verify by Title", async function () {
        let views = await GetListViews(this.siteUrl, listTitle, { includeViewFields: true }, true);
        const view = views.filter(v => v.Id === viewId);
        assert.strictEqual(view?.length, 1, "There should be exactly one view with the specified Id");
    });

    specify("remove view field from list view by Title", async function () {
        const result = await RemoveViewFieldFromListView(this.siteUrl, listTitle, viewId, fieldInternalName, true);
        assert.ok(result, "RemoveViewFieldFromListView should return true");
    });

    specify("verify by Id", async function () {
        let views = await GetListViews(this.siteUrl, listId, { includeViewFields: true }, true);
        const view = views.find(v => v.Id === viewId);
        assert.ok(!view?.ViewFields?.includes(fieldInternalName), "Field should be removed from view");
    });

    specify("add view field to list view by Title", async function () {
        const result = await AddViewFieldToListView(this.siteUrl, listTitle, viewId, fieldInternalName, true);
        assert.ok(result, "AddViewFieldToListView should return true");
    });

    specify("verify by Id", async function () {
        let views = await GetListViews(this.siteUrl, listId, { includeViewFields: true }, true);
        const view = views.filter(v => v.Id === viewId);
        assert.strictEqual(view?.length, 1, "There should be exactly one view with the specified Id");
    });
});
