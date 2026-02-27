import { firstOrNull } from "./collections.base";
import { isNotEmptyArray } from "./typecheckers";

/** looks through the current call stack to find all calling functions */
export function getStackCallers(levels?: number, skip?: number, filter?: string[]) {
    filter = isNotEmptyArray(filter) ? filter : ['node_modules','node:internal'];
    const allLines = new Error().stack.split('\n');
    const stack = allLines
        .filter(s => s.indexOf('at ') > 0 && !firstOrNull(filter, f => s.includes(f)))
        .map(s => {
            const value = s.slice(s.indexOf(' at ') + 4).split(' ');
            return value[0] === "async" ? value[1] : value[0];
        }).reverse();

    const end = (skip > 0 ? skip + 1 : 1) * -1;
    const start = levels > 0 ? stack.length - levels + end : 0;

    return stack.slice(start > 0 ? start : 0, end);
}