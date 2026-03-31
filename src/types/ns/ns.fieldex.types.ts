import { tnsFieldTypes } from "./ns.common.types";
import { tnsField } from "./ns.rest.types";
import { tnsrFieldValueTypes } from "./ns.restlet.types";

export type nsFieldEX = {
    restId?: string;
    restType?: tnsField["type"];
    description?: string;
    id: string;
    label: string;
    type: tnsFieldTypes;
    required?: boolean;
    readOnly?: boolean;
    defaultValue?: tnsrFieldValueTypes;
    options?: Array<{ value: string | number; text: string }>;
};