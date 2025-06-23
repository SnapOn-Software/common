import assert from "assert";

import {
    BaseTypes,
    ChangeTextFieldMode,
    CreateField,
    CreateList, DeleteField, DeleteList,
    FieldTypes,
    GetFieldSchema, GetList,
    GetListField,
    GetListFields,
    GetListFieldsAsHash,
    GetStandardListFields, IFieldInfoEX,
    ListTemplateTypes, RecycleList,
    UpdateField,
} from "../../src";

async function genericCreateList(siteUrl: string, title: string) {
    const info = {
        title,
        description: "test list",
        type: BaseTypes.GenericList,
        template: ListTemplateTypes.GenericList,
    };
    return await CreateList(siteUrl, info);
}

async function genericCreateField(siteUrl: string, listId: string, title: string) {
    const info = {
        Title: title,
        Type: FieldTypes.Text,
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
        ({Id: listId} = await genericCreateList(this.siteUrl, `TestList_${Date.now()}`));
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
            const updated = await UpdateField(this.siteUrl, listId, fieldInternalName, {Title: newTitle});
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
            assert.strictEqual(schema.Attributes.RichText, "TRUE", "RichText should be 'TRUE'");
            assert.strictEqual(schema.Attributes.RichTextMode, "FullHTML", "RichTextMode should be 'FullHTML'");
        })
    })

    describe("GetListFields...", function () {

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
