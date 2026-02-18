import { IDictionary } from "./common.types";

export interface IWebPartDefinition {
    Id: string;
    ZoneId: string;
    WebPart: IWebPart;
}

export interface IWebPart {
    ExportMode: WebPartExportMode;
    Hidden: boolean;
    IsClosed: boolean;
    Properties: IDictionary<string | number | boolean>;
    Subtitle: string;
    Title: string;
    TitleUrl: string;
    ZoneIndex: number;
};

export enum WebPartExportMode {
    None = 0,
    All = 1,
    NonSensitiveData = 2
}

export enum WebPartMethods {
    DeleteWebPart = "deletewebpart",
    SaveWebPartChanges = "savewebpartchanges"
}
