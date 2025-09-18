import { sortArray } from "./collections.base";
import { kwiz_cdn_hostname_production } from "./constants";
import { isNullOrEmptyString } from "./typecheckers";

//don't use kwiz_cdn_root since this might be saved in settings
export const stockUrl = `https://${kwiz_cdn_hostname_production}/products/apsig/images/diagrams`;
type DiagramInfo = {
    name: string;
    folderPrefix: string;
    filePrefix: string;
};
const diagrams: DiagramInfo[] = sortArray([
    { name: "Body, male, all", folderPrefix: "body-all", filePrefix: "body-all-" },
    { name: "Body, female, all", folderPrefix: "body-all", filePrefix: "body-all-fem-" },
    { name: "Body, male, front", folderPrefix: "body-frontal", filePrefix: "body-frontal-" },
    { name: "Body, female, front", folderPrefix: "body-frontal", filePrefix: "body-frontal-fem-" },
    { name: "Car", folderPrefix: "car", filePrefix: "car-" },
    { name: "Cat & Dog", folderPrefix: "cat-dog", filePrefix: "cat-dog-" },
    { name: "Cat", folderPrefix: "cat-dog", filePrefix: "cat-" },
    { name: "Dog", folderPrefix: "cat-dog", filePrefix: "dog-" },
    { name: "Face", folderPrefix: "face", filePrefix: "face-" },
    { name: "Pickup truck", folderPrefix: "pickup", filePrefix: "pickup-" },
    { name: "Shoulder & head", folderPrefix: "shoulder-head", filePrefix: "shoulder-head-" },
    { name: "Shoulder & head, female", folderPrefix: "shoulder-head", filePrefix: "shoulder-head-fem-" },
    { name: "Shoulder & head, all", folderPrefix: "shoulder-head-all", filePrefix: "shoulder-head-all-" },
    { name: "Shoulder & head, female, all", folderPrefix: "shoulder-head-all", filePrefix: "shoulder-head-all-fem-" },
    { name: "Signature line", folderPrefix: "signature", filePrefix: "signature-" }
], d => d.name);
type DiagramOption = {
    url: string;
    name: string;
};
const diagramTypes = [{ suffix: "diagram-transparent", label: "transparent" }, { suffix: "diagram-whitebg-transparent", label: "partially transparent" }, { suffix: "diagram-whitebg", label: "" }];
var diagramOptionsHiRes: DiagramOption[] = [];
var diagramOptions: DiagramOption[] = [];
function addDiagramOptions(info: DiagramInfo, options: DiagramOption[]) {
    diagramTypes.forEach(type => options.push({
        name: `${info.name}${isNullOrEmptyString(type.label) ? '' : `, ${type.label}`}`,
        url: `${info.folderPrefix}/${info.filePrefix}${type.suffix}.png`
    }));
}
diagrams.forEach(d => {
    addDiagramOptions(d, diagramOptionsHiRes);
    addDiagramOptions({ folderPrefix: `${d.folderPrefix}/small`, filePrefix: d.filePrefix, name: `${d.name}, small` }, diagramOptions);
});
export const DiagramOptions = { options: diagramOptions, hiRes: diagramOptionsHiRes };