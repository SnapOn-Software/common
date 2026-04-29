/** types for KWIZ sharepoint API */
import { IDictionary } from "./common.types";
import { AttachmentFilesRESTValue, BaseTypes, FileSystemObjectTypes, IFieldInfoEX, ISPEventReceiver, ListTemplateTypes, PrincipalType, RoleType } from "./sharepoint.types";

export interface ISiteInfo { Id: string; ServerRelativeUrl: string; }
export interface IRootWebInfo { Id: string; ServerRelativeUrl: string; }

export interface ISPRestError {
    code: string;
    message: string;
}

export interface IUserInfo {
    Id: number;
    LoginName: string;
    UserPrincipalName: string;
    Title: string;
    IsSiteAdmin: boolean;
    Email: string;
    Groups?: IUserGroupInfo[];
    PrincipalType: PrincipalType;
}
export interface IUserGroupInfo {
    Id: number;
    LoginName: string;
    Title: string;
    Description: string;
}

export interface IGroupInfo {
    Id: number;
    Title: string;
    Description: string;
    CanCurrentUserViewMembership: boolean;
    OnlyAllowMembersViewMembership: boolean;
    LoginName: string;
    Users?: IUserInfo[];
    PrincipalType: PrincipalType.SharePointGroup;
    IsHiddenInUI?: boolean;
    OwnerTitle?: string;
}

// eslint-disable-next-line no-shadow
export enum ListExperienceOptions {
    Default = 0,
    Modern = 1,
    Classic = 2
}

export interface iList {
    Title: string;
    Description: string;
    EnableAttachments: boolean;
    EnableModeration: boolean;
    BaseTemplate: ListTemplateTypes;
    BaseType: BaseTypes;
    Id: string;
    Hidden: boolean;
    IsApplicationList: boolean;
    IsPrivate: boolean;
    IsCatalog: boolean;
    ImageUrl: string;
    ItemCount: number;
    ParentWebUrl: string;
    EntityTypeName: string;
    DefaultViewUrl: string;
    ParentWeb: { Id: string; Title: string; };
    Views?: iListView[];
    ContentTypes?: iContentType[];
    EffectiveBasePermissions: { High: number; Low: number; },
    RootFolder?: {
        ServerRelativeUrl: string;
        Name: string;
    };
    EventReceivers?: ISPEventReceiver[];
    ListExperienceOptions?: ListExperienceOptions;
}

export enum DraftVisibilityType {
    Reader = 0,
    /** default */
    Author = 1,
    /** approvers, and the person who submitted the draft */
    Approver = 2
}

export interface iListVersionSettings {
    /** saving creates a draft */
    EnableMinorVersions: boolean;
    /** @deprecated versioning is enabled. (this is now always on in M365 libraries) */
    EnableVersioning: boolean;
    DraftVersionVisibility: DraftVisibilityType;
    MajorWithMinorVersionsLimit: number;
    MajorVersionLimit: number;
    EnableModeration: boolean;
}

export interface iListView {
    Title: string;
    Id: string;
    ServerRelativeUrl: string;
    RowLimit: number;
    Paged: boolean;
    ViewQuery: string;
    ListViewXml: string;
    PersonalView: boolean;
    MobileView: boolean;
    MobileDefaultView: boolean;
    Hidden: boolean;
    DefaultView: boolean;
    ReadOnlyView: boolean;
    ViewFields?: string[];
    CustomFormatter?: string;
}

export interface IListWorkflowAssociation {
    AllowManual: boolean;
    BaseId: string;//guid
    Created: string;
    Description: string;
    Enabled: boolean;
    HistoryListTitle: string;
    Id: string;//guid
    InstantiationUrl?: string;
    InternalName: string;
    IsDeclarative: boolean;
    ListId: string;//guid
    Modified: string;
    Name: string;
    RunningInstances: number;
    TaskListTitle: string;
    WebId: string;//guid
}

export interface iContentType {
    Name: string;
    Description: string;
    StringId: string;
    Group: string;
    Hidden: boolean;
    ReadOnly: boolean;
    NewFormUrl: string;
    DisplayFormUrl: string;
    EditFormUrl: string;
    Fields?: IFieldInfoEX[];
    Sealed: boolean;
    MobileNewFormUrl: string;
    MobileDisplayFormUrl: string;
    MobileEditFormUrl: string;
    NewFormTemplateName: string;
    DisplayFormTemplateName: string;
    EditFormTemplateName: string;
}

// eslint-disable-next-line no-shadow
export enum WebTypes {
    Team = 0,
    Group = 1,
    App = 2,
    Other = 3
}
export interface IWebBasicInfo {
    Title: string;
    ServerRelativeUrl: string;
    WebId: string;
    /**STS, APP, WIKI, MPS, APPCATALOG, DEV, PWA, PWS, SPS, GROUP or other... */
    WebTemplate: "STS" | "APP" | "WIKI" | "MPS" | "APPCATALOG" | "DEV" | "PWA" | "PWS" | "SPS" | "GROUP" | string;
    WebType: WebTypes;
    Description?: string;
    SiteLogoUrl?: string;
}

export interface IRestRoleDefinition {
    BasePermissions: { High: number; Low: number; };
    Description: string;
    Hidden: boolean;
    Id: number;
    Name: string;
    Order: number;
    RoleTypeKind: RoleType;
}

export interface IAppTile {
    Title: string;
    ProductId: string;
}

export interface IFileInfo {
    Exists: boolean;
    Name: string;
    ServerRelativeUrl: string;
    TimeCreated: Date;
    TimeLastModified: Date;
    Title: string;
    Level: FileLevel;
    ListItemAllFields?: IDictionary<any>;
}

export interface IFileInfoWithModerationStatus extends IFileInfo {
    ListItemAllFields?: {
        OData__ModerationStatus?: ModerationStatus
    }
}

export interface ITimeZone {
    Description: string;
    Id: number;
    Information: { Bias: number; DaylightBias: number; StandardBias: number; };
}

// eslint-disable-next-line no-shadow
export enum GeListItemsFoldersBehaviour { AllItemsNoFolders, ItemsAndFoldersFlat, ItemsInsideFolders }

export interface IRestItem {
    Id: number;
    FileRef: string;
    FileDirRef: string;
    FileLeafRef: string;
    /** file type (lower case) or 'folder' or 'listitem' */
    FileType: 'folder' | 'listitem' | string;
    /** Folder=1, list item=0 */
    FileSystemObjectType: FileSystemObjectTypes;
    [InternalName: string]: any;
    FieldValuesAsText?: IDictionary<string>;
    FieldValuesForEdit?: IDictionary<any>;
    AttachmentFiles?: AttachmentFilesRESTValue;

    /** File name (no extension) for files or folders, Title for list items or 'Item #ID' for items with an empty title */
    __DisplayTitle: string;
    /** For a folder, this will have items inside the folder */
    __Items?: IRestItem[];
    /** For an item inside a folder, this will be the parent folder */
    __ParentFolder?: IRestItem;
}

export interface IRestItemExpandedLookupValue {
    Id: number;
    Title: string;
}

export type UserEntityValueType = {
    principalType: PrincipalType.User | PrincipalType.SecurityGroup | PrincipalType.SharePointGroup;
    spId: number;
    loginOrPrincipalName?: string;
    /** not saved in settings. pre-loaded when loading settings. */
    title?: string;
    /** not saved in settings. pre-loaded when loading settings. */
    email?: string;
};

export interface IWebRegionalSettings {
    AdjustHijriDays: number;
    AlternateCalendarType: number;
    AM: string;
    CalendarType: number;
    Collation: number;
    CollationLCID: number;
    DateFormat: number;
    DateSeparator: string;
    DecimalSeparator: string;
    DigitGrouping: string;
    FirstDayOfWeek: number;
    FirstWeekOfYear: number;
    IsEastAsia: boolean;
    IsRightToLeft: boolean;
    IsUIRightToLeft: boolean;
    ListSeparator: string;
    LocaleId: number;
    NegativeSign: string;
    NegNumberMode: number;
    PM: string;
    PositiveSign: string;
    ShowWeeks: boolean;
    ThousandSeparator: string;
    Time24: boolean;
    TimeMarkerPosition: number;
    TimeSeparator: string;
    WorkDayEndHour: number;
    WorkDays: number;
    WorkDayStartHour: number;
}

/** 
 * Specifies the moderation status for a file/item (https://learn.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-wssfo3/4342322d-6fab-4dc5-8ccd-b808a5e25acf)
*/
export enum ModerationStatus {
    /** The list item is approved. */
    Approved,
    /** The list item has been denied approval. */
    Rejected,
    /** The list item is pending approval. */
    Pending,
    /** The list item is in the draft or checked out state. */
    Draft,
    /** The list item is scheduled for automatic approval at a future date. */
    Scheduled
}

/** 
 * Specifies the publishing level for a file (https://learn.microsoft.com/en-us/previous-versions/office/sharepoint-visio/jj246272(v=office.15))
*/
export enum FileLevel {
    /** Enumeration whose values specify whether the file is a published version.  */
    Published = 1,
    /** Enumeration whose values specify whether the file is a draft..  */
    Draft = 2,
    /** Enumeration whose values specify whether the file is checked out to the current user.  */
    Checkout = 255
}