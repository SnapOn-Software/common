/** types for known OOB SharePoint objects  - do not import */
//todo: Kevin - make a disctinction between this file and the utils.types file
//keep full SP objects here, move the ones our API created to the utils types
//have a consistent naming convention, usually I[]Info refers to our objects, but iList is our API object and IListInfo seems to be the full object
export interface IFieldJsonSchema {
    Attributes: {
        ID?: string;
        Name?: string;
        StaticName?: string;
        [key: string]: string;
    };
    Customizations: { [PropertyName: string]: string; };
    Choices?: string[];
}

export interface IFieldJsonSchemaLookup extends IFieldJsonSchema {
    Attributes: {
        Mult?: "TRUE" | "FALSE";
        WebId?: string;
        List?: string;
        ShowField?: string;
    };
}

// eslint-disable-next-line no-shadow
export enum PageType {
    Invalid = -1,
    DefaultView = 0,
    NormalView = 1,
    DialogView = 2,
    View = 3,
    DisplayForm = 4,
    DisplayFormDialog = 5,
    EditForm = 6,
    EditFormDialog = 7,
    NewForm = 8,
    NewFormDialog = 9,
    SolutionForm = 10,
    PAGE_MAXITEMS = 11
}

export interface IContentTypeInfo {
    Description: string;
    DisplayFormTemplateName: string;
    DisplayFormUrl: string;
    DocumentTemplate: string;
    DocumentTemplateUrl: string;
    EditFormTemplateName: string;
    EditFormUrl: string;
    Group: string;
    Hidden: boolean;
    Id: {
        StringValue: string;
    };
    JSLink: string;
    MobileDisplayFormUrl: string;
    MobileEditFormUrl: string;
    MobileNewFormUrl: string;
    Name: string;
    NewFormTemplateName: string;
    NewFormUrl: string;
    ReadOnly: boolean;
    SchemaXml: string;
    Scope: string;
    Sealed: boolean;
    StringId: string;
}

// eslint-disable-next-line no-shadow
export enum ChoiceFieldFormatType {
    Dropdown = 0,
    RadioButtons = 1
}

export interface IFieldInfo {
    DefaultFormula: string | null;
    DefaultValue: string | null;
    Description: string;
    //Direction: string;
    EnforceUniqueValues: boolean;
    //EntityPropertyName: string;
    FieldTypeKind: FieldTypes;
    //Filterable: boolean;
    //FromBaseType: boolean;
    Group: string;
    Hidden: boolean;
    Id: string;
    Indexed: boolean;
    //IndexStatus: number;
    InternalName: string;
    JSLink: string;
    //PinnedToFiltersPane: boolean;
    ReadOnlyField: boolean;
    Required: boolean;
    SchemaXml: string;
    //Scope: string;
    //Sealed: boolean;
    //ShowInFiltersPane: number;
    //Sortable: boolean;
    StaticName: string;
    Title: string;
    TypeAsString: string | FieldTypeAsString;
    ClientSideComponentProperties?: string;
    ClientSideComponentId?: string;
    //TypeDisplayName: string;
    //TypeShortDescription: string;
    //ValidationFormula: string | null;
    //ValidationMessage: string | null;
}

// eslint-disable-next-line no-shadow
export enum DateTimeFieldFormatType {
    DateOnly = 0,
    DateTime = 1
}

// eslint-disable-next-line no-shadow
export enum DateTimeFieldFriendlyFormatType {
    //	Undefined. The default rendering will be used.
    Unspecified = 0,
    //   The standard absolute representation will be used.
    Disabled = 1,
    //	The standard friendly relative representation will be used (for example, "today at 3:00 PM").
    Relative = 2
}

// eslint-disable-next-line no-shadow
export enum UrlFieldFormatType {
    Hyperlink = 0,
    Image = 1
}

// eslint-disable-next-line no-shadow
export enum FieldTypes {
    Invalid = 0,
    Integer = 1,
    Text = 2,
    Note = 3,
    DateTime = 4,
    Counter = 5,
    Choice = 6,
    Lookup = 7,
    Boolean = 8,
    Number = 9,
    Currency = 10,
    URL = 11,
    Computed = 12,
    Threading = 13,
    Guid = 14,
    MultiChoice = 15,
    GridChoice = 16,
    Calculated = 17,
    File = 18,
    Attachments = 19,
    User = 20,
    Recurrence = 21,
    CrossProjectLink = 22,
    ModStat = 23,
    Error = 24,
    ContentTypeId = 25,
    PageSeparator = 26,
    ThreadIndex = 27,
    WorkflowStatus = 28,
    AllDayEvent = 29,
    WorkflowEventType = 30,
    Geolocation = 31,
    Location = 33
}

// eslint-disable-next-line no-shadow
export enum ListTemplateTypes {
    AccessRequest = 160,
    AdminTasks = 1200,
    Agenda = 201,
    Announcements = 104,
    AppDataCatalog = 125,
    CallTrack = 404,
    Categories = 303,
    Circulation = 405,
    Comments = 302,
    Contacts = 105,
    CustomGrid = 120,
    DataConnectionLibrary = 130,
    DataSources = 110,
    Decision = 204,
    DesignCatalog = 124,
    DeveloperSiteDraftApps = 1230,
    DiscussionBoard = 108,
    DocumentLibrary = 101,
    Events = 106,
    ExternalList = 600,
    Facility = 402,
    GanttTasks = 150,
    GenericList = 100,
    HealthReports = 1221,
    HealthRules = 1220,
    HelpLibrary = 151,
    Holidays = 421,
    HomePageLibrary = 212,
    IMEDic = 499,
    InvalidType = -1,
    IssueTracking = 1100,
    Links = 103,
    ListTemplateCatalog = 114,
    MaintenanceLogs = 175,
    MasterPageCatalog = 116,
    MeetingObjective = 207,
    Meetings = 200,
    MeetingUser = 202,
    MySiteDocumentLibrary = 700,
    NoCodePublic = 122,
    NoCodeWorkflows = 117,
    NoListTemplate = 0,
    PictureLibrary = 109,
    Posts = 301,
    SolutionCatalog = 121,
    Survey = 102,
    Tasks = 107,
    TasksWithTimelineAndHierarchy = 171,
    TextBox = 210,
    ThemeCatalog = 123,
    ThingsToBring = 211,
    Timecard = 420,
    UserInformation = 112,
    WebPageLibrary = 119,
    WebPartCatalog = 113,
    WebTemplateCatalog = 111,
    Whereabouts = 403,
    WorkflowHistory = 140,
    WorkflowProcess = 118,
    XMLForm = 115
}
// eslint-disable-next-line no-shadow
export enum BaseTypes {
    DiscussionBoard = 3,
    DocumentLibrary = 1,
    GenericList = 0,
    Issue = 5,
    Survey = 4,
    UnspecifiedBaseType = -1,
    Unused = 2
}

export interface ISiteUserProps {
    /**
     * Contains Site user email
     *
     */
    Email: string;
    /**
     * Contains Site user Id
     *
     */
    Id: number;
    /**
     * Site user IsHiddenInUI
     *
     */
    IsHiddenInUI: boolean;
    /**
     * Site user IsShareByEmailGuestUser
     *
     */
    IsShareByEmailGuestUser: boolean;
    /**
     * Describes if Site user Is Site Admin
     *
     */
    IsSiteAdmin: boolean;
    /**
     * Site user LoginName
     *
     */
    LoginName: string;
    /**
     * Site user Principal type
     *
     */
    PrincipalType: number | PrincipalType;
    /**
     * Site user Title
     *
     */
    Title: string;
}

export interface ISiteUserInfo extends ISiteUserProps {
    Expiration: string;
    IsEmailAuthenticationGuestUser: boolean;
    UserId: {
        NameId: string;
        NameIdIssuer: string;
    };
    UserPrincipalName: string | null;
}

export interface IAttachmentInfo {
    //EntityTypeName: string;
    FileName: string;
    FileNameAsPath: {
        DecodedUrl: string;
    };
    ServerRelativePath: {
        DecodedUrl: string;
    };
    ServerRelativeUrl: string;
}

export interface IWebInfo {
    AlternateCssUrl: string;
    AppInstanceId: string;
    ClassicWelcomePage: string | null;
    Configuration: number;
    Created: string;
    CurrentChangeToken: {
        StringValue: string;
    };
    CustomMasterUrl: string;
    Description: string;
    DesignPackageId: string;
    DocumentLibraryCalloutOfficeWebAppPreviewersDisabled: boolean;
    EnableMinimalDownload: boolean;
    FooterEmphasis: number;
    FooterEnabled: boolean;
    FooterLayout: number;
    HeaderEmphasis: number;
    HeaderLayout: number;
    HorizontalQuickLaunch: boolean;
    Id: string;
    IsHomepageModernized: boolean;
    IsMultilingual: boolean;
    IsRevertHomepageLinkHidden: boolean;
    Language: number;
    LastItemModifiedDate: string;
    LastItemUserModifiedDate: string;
    MasterUrl: string;
    MegaMenuEnabled: boolean;
    NavAudienceTargetingEnabled: boolean;
    NoCrawl: boolean;
    ObjectCacheEnabled: boolean;
    OverwriteTranslationsOnChange: boolean;
    QuickLaunchEnabled: boolean;
    RecycleBinEnabled: boolean;
    ResourcePath: {
        DecodedUrl: string;
    };
    SearchScope: number;
    ServerRelativeUrl: string;
    SiteLogoUrl: string | null;
    SyndicationEnabled: boolean;
    TenantAdminMembersCanShare: number;
    Title: string;
    TreeViewEnabled: boolean;
    UIVersion: number;
    UIVersionConfigurationEnabled: boolean;
    Url: string;
    /**STS, APP, WIKI, MPS, APPCATALOG, DEV, PWA, PWS, SPS, GROUP or other... */
    WebTemplate: "STS" | "APP" | "WIKI" | "MPS" | "APPCATALOG" | "DEV" | "PWA" | "PWS" | "SPS" | "GROUP" | string;
    WelcomePage: string;
}

export interface ISiteGroupInfo {
    AllowMembersEditMembership: boolean;
    AllowRequestToJoinLeave: boolean;
    AutoAcceptRequestToJoinLeave: boolean;
    Description: string;
    Id: number;
    IsHiddenInUI: boolean;
    LoginName: string;
    OnlyAllowMembersViewMembership: boolean;
    OwnerTitle: string;
    PrincipalType: PrincipalType.SharePointGroup;
    RequestToJoinLeaveEmailSetting: string | null;
    Title: string;
}

export interface IContentTypeInfo {
    Description: string;
    DisplayFormTemplateName: string;
    DisplayFormUrl: string;
    DocumentTemplate: string;
    DocumentTemplateUrl: string;
    EditFormTemplateName: string;
    EditFormUrl: string;
    Group: string;
    Hidden: boolean;
    Id: {
        StringValue: string;
    };
    JSLink: string;
    MobileDisplayFormUrl: string;
    MobileEditFormUrl: string;
    MobileNewFormUrl: string;
    Name: string;
    NewFormTemplateName: string;
    NewFormUrl: string;
    ReadOnly: boolean;
    SchemaXml: string;
    Scope: string;
    Sealed: boolean;
    StringId: string;
}

// eslint-disable-next-line no-shadow
export enum ViewScope {
    DefaultValue = 0,
    Recursive = 1,
    RecursiveAll = 2,
    FilesOnly = 3
}

export interface IViewInfo {
    EditorModified: boolean;
    Formats: string | null;
    Hidden: boolean;
    HtmlSchemaXml: string;
    Id: string;
    ImageUrl: string;
    IncludeRootFolder: boolean;
    JSLink: string;
    ListViewXml: string;
    Method: string | null;
    MobileDefaultView: boolean;
    MobileView: boolean;
    ModerationType: string | null;
    NewDocumentTemplates: string;
    OrderedView: boolean;
    Paged: boolean;
    PersonalView: boolean;
    ReadOnlyView: boolean;
    RequiresClientIntegration: boolean;
    RowLimit: number;
    Scope: ViewScope;
    ServerRelativePath: {
        DecodedUrl: string;
    };
    ServerRelativeUrl: string;
    StyleId: string | null;
    TabularView: boolean;
    Threaded: boolean;
    Title: string;
    Toolbar: string;
    ToolbarTemplateName: string | null;
    ViewData: string | null;
    ViewJoins: string | null;
    ViewProjectedFields: {
        SchemaXml: string;
    } | null;
    ViewQuery: string;
    ViewType: string;
    VisualizationInfo: any | null;
    DefaultView?: boolean;
}

export interface ICamlQuery {
    /**
     * Gets or sets a value that indicates whether the query returns dates in Coordinated Universal Time (UTC) format.
     */
    DatesInUtc?: boolean;
    /**
     * Gets or sets a value that specifies the server relative URL of a list folder from which results will be returned.
     */
    FolderServerRelativeUrl?: string;
    /**
     * Gets or sets a value that specifies the information required to get the next page of data for the list view.
     */
    ListItemCollectionPosition?: IListItemCollectionPosition;
    /**
     * Gets or sets value that specifies the XML schema that defines the list view.
     */
    ViewXml?: string;
}
/**
 * Specifies the information required to get the next page of data for a list view.
 */
export interface IListItemCollectionPosition {
    /**
     * Gets or sets a value that specifies information, as name-value pairs, required to get the next page of data for a list view.
     */
    PagingInfo: string;
}

export interface IListInfo {
    AllowContentTypes: boolean;
    AllowDeletion: boolean;
    BaseTemplate: ListTemplateTypes;
    BaseType: BaseTypes;
    BrowserFileHandling: any;
    ContentTypes: any[];
    ContentTypesEnabled: boolean;
    CrawlNonDefaultViews: boolean;
    CreatablesInfo: any;
    Created: string;
    CurrentChangeToken: any;
    CustomActionElements: any[];
    DataSource: any;
    DefaultContentApprovalWorkflowId: string;
    DefaultDisplayFormUrl: string;
    DefaultEditFormUrl: string;
    DefaultNewFormUrl: string;
    DefaultView: any;
    DefaultViewPath: any;
    DefaultViewUrl: string;
    Description: string;
    DescriptionResource: any;
    Direction: string;
    DocumentTemplateUrl: string;
    DraftVersionVisibility: any;
    EffectiveBasePermissions: IBasePermissions;
    EffectiveBasePermissionsForUI: IBasePermissions;
    EnableAssignToEmail: boolean;
    EnableAttachments: boolean;
    EnableFolderCreation: boolean;
    EnableMinorVersions: boolean;
    EnableModeration: boolean;
    EnableRequestSignOff: boolean;
    EnableVersioning: boolean;
    EntityTypeName: string;
    EventReceivers: any[];
    ExcludeFromOfflineClient: boolean;
    ExemptFromBlockDownloadOfNonViewableFiles: boolean;
    Fields: Partial<IFieldInfo>[];
    FileSavePostProcessingEnabled: boolean;
    ForceCheckout: boolean;
    Forms: IFormInfo[];
    HasExternalDataSource: boolean;
    Hidden: boolean;
    Id: string;
    ImagePath: {
        DecodedUrl: string;
    };
    ImageUrl: string;
    InformationRightsManagementSettings: any[];
    IrmEnabled: boolean;
    IrmExpire: boolean;
    IrmReject: boolean;
    IsApplicationList: boolean;
    IsCatalog: boolean;
    IsPrivate: boolean;
    IsSiteAssetsLibrary: boolean;
    IsSystemList: boolean;
    ItemCount: number;
    LastItemDeletedDate: string;
    LastItemModifiedDate: string;
    LastItemUserModifiedDate: string;
    ListExperienceOptions: number;
    ListItemEntityTypeFullName: string;
    MajorVersionLimit: number;
    MajorWithMinorVersionsLimit: number;
    MultipleDataList: boolean;
    NoCrawl: boolean;
    OnQuickLaunch: boolean;
    ParentWebPath: {
        DecodedUrl: string;
    };
    ParentWebUrl: string;
    ParserDisabled: boolean;
    ReadSecurity: number;
    RootFolder: IFolderInfo;
    SchemaXml: string;
    ServerTemplateCanCreateFolders: boolean;
    TemplateFeatureId: string;
    Title: string;
    UserCustomActions: IUserCustomActionInfo[];
    ValidationFormula: string;
    ValidationMessage: string;
    Views: IViewInfo[];
    WorkflowAssociations: any[];
    WriteSecurity: number;
}

export interface IBasePermissions {
    Low: number;
    High: number;
}

export interface IFormInfo {
    FormType: PageType;
    Id: string;
    ResourcePath: {
        DecodedUrl: string;
    };
    DecodedUrl: string;
    ServerRelativeUrl: string;
}

export interface IFolderBasicInfo {
    Name: string;
    ServerRelativeUrl: string;
}
export interface IFolderInfo extends IFolderBasicInfo {
    readonly "odata.id": string;
    Exists: boolean;
    IsWOPIEnabled: boolean;
    ItemCount: number;
    ProgID: string | null;
    TimeCreated: string;
    TimeLastModified: string;
    UniqueId: string;
    WelcomePage: string;
    Folders?: IFolderInfo[]
}

// eslint-disable-next-line no-shadow
export enum UserCustomActionRegistrationType {
    None = 0,
    List = 1,
    ContentType = 2,
    ProgId = 3,
    FileType = 4
}

export type UserCustomActionRegistrationTypeNames = keyof typeof UserCustomActionRegistrationType;

// eslint-disable-next-line no-shadow
export enum UserCustomActionScope {
    Unknown = 0,
    Site = 2,
    Web = 3,
    List = 4
}

export interface IUserCustomActionInfo {
    CommandUIExtension: string;
    Description: string;
    Group: string;
    Id: string;
    ImageUrl: string;
    Location: string;
    Name: string;
    RegistrationId: string;
    RegistrationType: UserCustomActionRegistrationType;
    /** to use a permission kind call: new SPBasePermissions(SPBasePermissionKind.ManageLists).toJson() */
    Rights: IBasePermissions;
    Scope: UserCustomActionScope;
    ScriptBlock: string;
    ScriptSrc: string;
    Sequence: number;
    Title: string;
    Url: string;
    VersionOfUserCustomAction: string;
}

/**
 * Specifies the type of a principal. Use $PrincipalType when isolatedModules is true
 */
// eslint-disable-next-line no-shadow
export enum PrincipalType {
    /**
     * Enumeration whose value specifies no principal type.
     */
    None = 0,
    /**
     * Enumeration whose value specifies a user as the principal type.
     */
    User = 1,
    /**
     * Enumeration whose value specifies a distribution list as the principal type.
     */
    DistributionList = 2,
    /**
     * Enumeration whose value specifies a security group as the principal type.
     */
    SecurityGroup = 4,
    /**
     * Enumeration whose value specifies a group as the principal type.
     */
    SharePointGroup = 8,
    /**
     * Enumeration whose value specifies all principal types.
     */
    All = 15
}

/** PrincipalType enum values for projects that can't use enums (when isolatedModules is true) 
 * @deprecated use PrincipalType
 */
export const $PrincipalType = {
    /**
     * Enumeration whose value specifies no principal type.
     */
    None: PrincipalType.None,
    /**
     * Enumeration whose value specifies a user as the principal type.
     */
    User: PrincipalType.User,
    /**
     * Enumeration whose value specifies a distribution list as the principal type.
     */
    DistributionList: PrincipalType.DistributionList,
    /**
     * Enumeration whose value specifies a security group as the principal type.
     */
    SecurityGroup: PrincipalType.SecurityGroup,
    /**
     * Enumeration whose value specifies a group as the principal type.
     */
    SharePointGroup: PrincipalType.SharePointGroup,
    /**
     * Enumeration whose value specifies all principal types.
     */
    All: PrincipalType.All
}


// eslint-disable-next-line no-shadow
export enum SPBasePermissionKind {
    /**
     * Has no permissions on the Site. Not available through the user interface.
     */
    EmptyMask = 0,
    /**
     * View items in lists, documents in document libraries, and Web discussion comments.
     */
    ViewListItems = 1,
    /**
     * Add items to lists, documents to document libraries, and Web discussion comments.
     */
    AddListItems = 2,
    /**
     * Edit items in lists, edit documents in document libraries, edit Web discussion comments
     * in documents, and customize Web Part Pages in document libraries.
     */
    EditListItems = 3,
    /**
     * Delete items from a list, documents from a document library, and Web discussion
     * comments in documents.
     */
    DeleteListItems = 4,
    /**
     * Approve a minor version of a list item or document.
     */
    ApproveItems = 5,
    /**
     * View the source of documents with server-side file handlers.
     */
    OpenItems = 6,
    /**
     * View past versions of a list item or document.
     */
    ViewVersions = 7,
    /**
     * Delete past versions of a list item or document.
     */
    DeleteVersions = 8,
    /**
     * Discard or check in a document which is checked out to another user.
     */
    CancelCheckout = 9,
    /**
     * Create, change, and delete personal views of lists.
     */
    ManagePersonalViews = 10,
    /**
     * Create and delete lists, add or remove columns in a list, and add or remove public views of a list.
     */
    ManageLists = 12,
    /**
     * View forms, views, and application pages, and enumerate lists.
     */
    ViewFormPages = 13,
    /**
     * Make content of a list or document library retrieveable for anonymous users through SharePoint search.
     * The list permissions in the site do not change.
     */
    AnonymousSearchAccessList = 14,
    /**
     * Allow users to open a Site, list, or folder to access items inside that container.
     */
    Open = 17,
    /**
     * View pages in a Site.
     */
    ViewPages = 18,
    /**
     * Add, change, or delete HTML pages or Web Part Pages, and edit the Site using
     * a Windows SharePoint Services compatible editor.
     */
    AddAndCustomizePages = 19,
    /**
     * Apply a theme or borders to the entire Site.
     */
    ApplyThemeAndBorder = 20,
    /**
     * Apply a style sheet (.css file) to the Site.
     */
    ApplyStyleSheets = 21,
    /**
     * View reports on Site usage.
     */
    ViewUsageData = 22,
    /**
     * Create a Site using Self-Service Site Creation.
     */
    CreateSSCSite = 23,
    /**
     * Create subsites such as team sites, Meeting Workspace sites, and Document Workspace sites.
     */
    ManageSubwebs = 24,
    /**
     * Create a group of users that can be used anywhere within the site collection.
     */
    CreateGroups = 25,
    /**
     * Create and change permission levels on the Site and assign permissions to users
     * and groups.
     */
    ManagePermissions = 26,
    /**
     * Enumerate files and folders in a Site using Microsoft Office SharePoint Designer
     * and WebDAV interfaces.
     */
    BrowseDirectories = 27,
    /**
     * View information about users of the Site.
     */
    BrowseUserInfo = 28,
    /**
     * Add or remove personal Web Parts on a Web Part Page.
     */
    AddDelPrivateWebParts = 29,
    /**
     * Update Web Parts to display personalized information.
     */
    UpdatePersonalWebParts = 30,
    /**
     * Grant the ability to perform all administration tasks for the Site as well as
     * manage content, activate, deactivate, or edit properties of Site scoped Features
     * through the object model or through the user interface (UI). When granted on the
     * root Site of a Site Collection, activate, deactivate, or edit properties of
     * site collection scoped Features through the object model. To browse to the Site
     * Collection Features page and activate or deactivate Site Collection scoped Features
     * through the UI, you must be a Site Collection administrator.
     */
    ManageWeb = 31,
    /**
     * Content of lists and document libraries in the Web site will be retrieveable for anonymous users through
     * SharePoint search if the list or document library has AnonymousSearchAccessList set.
     */
    AnonymousSearchAccessWebLists = 32,
    /**
     * Use features that launch client applications. Otherwise, users must work on documents
     * locally and upload changes.
     */
    UseClientIntegration = 37,
    /**
     * Use SOAP, WebDAV, or Microsoft Office SharePoint Designer interfaces to access the Site.
     */
    UseRemoteAPIs = 38,
    /**
     * Manage alerts for all users of the Site.
     */
    ManageAlerts = 39,
    /**
     * Create e-mail alerts.
     */
    CreateAlerts = 40,
    /**
     * Allows a user to change his or her user information, such as adding a picture.
     */
    EditMyUserInfo = 41,
    /**
     * Enumerate permissions on Site, list, folder, document, or list item.
     */
    EnumeratePermissions = 63,
    /**
     * Has all permissions on the Site. Not available through the user interface.
     */
    FullMask = 65
}
export type SPBasePermissionKindNames = keyof typeof SPBasePermissionKind;

export const SPBasePermissionMask = {
    EmptyMask: { High: 0x0, Low: 0x0 },
    ViewListItems: { High: 0x0, Low: 0x1 },
    AddListItems: { High: 0x0, Low: 0x2 },
    EditListItems: { High: 0x0, Low: 0x4 },
    DeleteListItems: { High: 0x0, Low: 0x8 },
    ApproveItems: { High: 0x0, Low: 0x10 },
    OpenItems: { High: 0x0, Low: 0x20 },
    ViewVersions: { High: 0x0, Low: 0x40 },
    DeleteVersions: { High: 0x0, Low: 0x80 },
    CancelCheckout: { High: 0x0, Low: 0x100 },
    ManagePersonalViews: { High: 0x0, Low: 0x200 },
    ManageLists: { High: 0x0, Low: 0x800 },
    ViewFormPages: { High: 0x0, Low: 0x1000 },
    Open: { High: 0x0, Low: 0x20000 },
    ViewPages: { High: 0x0, Low: 0x20000 },
    LayoutsPage: { High: 0x0, Low: 0x21000 },
    AddAndCustomizePages: { High: 0x0, Low: 0x40000 },
    ApplyThemeAndBorder: { High: 0x0, Low: 0x80000 },
    ApplyStyleSheets: { High: 0x0, Low: 0x100000 },
    ViewUsageData: { High: 0x0, Low: 0x200000 },
    CreateSSCSite: { High: 0x0, Low: 0x400000 },
    ManageSubwebs: { High: 0x0, Low: 0x800000 },
    CreateGroups: { High: 0x0, Low: 0x1000000 },
    ManagePermissions: { High: 0x0, Low: 0x2000000 },
    BrowseDirectories: { High: 0x0, Low: 0x4000000 },
    BrowserUserInfo: { High: 0x0, Low: 0x8000000 },
    AddDelPrivateWebParts: { High: 0x0, Low: 0x10000000 },
    UpdatePersonalWebParts: { High: 0x0, Low: 0x20000000 },
    ManageWeb: { High: 0x0, Low: 0x40000000 },
    UseClientIntegration: { High: 0x10, Low: 0x0 },
    UseRemoteAPIs: { High: 0x20, Low: 0x0 },
    ManageAlerts: { High: 0x40, Low: 0x0 },
    CreateAlerts: { High: 0x80, Low: 0x0 },
    EditMyUserInfo: { High: 0x100, Low: 0x0 },
    EnumeratePermissions: { High: 0x40000000, Low: 0x0 },
    FullMask: { High: 0x7FFFFFFF, Low: 0xFFFFFFFF }
};

// eslint-disable-next-line no-shadow
export enum PersonSelectionMode {
    Users = 0,
    UsersAndGroups = 1
}

// eslint-disable-next-line no-shadow
export enum ItemFormDialogResult {
    Closed = 0,
    Created = 1,
    Saved = 2
}

// eslint-disable-next-line no-shadow
export enum FileSystemObjectTypes {
    ListItemOrFile = 0,
    Folder = 1
}

// eslint-disable-next-line no-shadow
export enum SPFileSystemObjectType {
    invalid,
    file,
    folder,
    web,
}

export interface ISpfxBaseComponentContext {
    pageContext: {
        user: { email: string; };
        list: {
            title: string;
            id: { toString: () => string; };
        };
        web: {
            serverRelativeUrl: string;
            //used by taxonomy picker spfx pnp react
            absoluteUrl: string;
            //used by taxonomy picker spfx pnp react issue 8129
            language: number;
            id: { toString: () => string; };
        };
        //used by taxonomy picker spfx pnp react issue 886
        cultureInfo: {
            currentCultureName: string;
            currentUICultureName: string;
            isRightToLeft: boolean;
        };
    };
    //used by taxonomy picker spfx pnp react
    spHttpClient: {
        post: (url: string,
            configuration: any,
            postOptions: {
                body?: BodyInit;
                headers?: HeadersInit;
            }) => Promise<{ json: () => Promise<any>; }>;
        get: (url: string,
            configuration: any,
            postOptions: {
                body?: BodyInit;
                headers?: HeadersInit;
            }) => Promise<{ json: () => Promise<any>; }>;
    };
}

// eslint-disable-next-line no-shadow
export enum MissingOptionsType {
    /** No missing options */
    None = 0,
    /** Optional missing options, can render and load them later */
    MissingOptional = 1,
    /** Required missing options, cannot render until these options are loaded */
    MissingRequired = 2
}

/** Calculated - a calculated column created by the user. Computed - a system column, such as content type, edit menu, select column */
export type FieldTypeAsString = "Text" | "Note" | "Choice" | "MultiChoice" |
    "Boolean" | "DateTime" | "User" | "UserMulti" | "Lookup" |
    "LookupMulti" | "URL" | "Number" | "Currency" |
    "TaxonomyFieldType" | "TaxonomyFieldTypeMulti" |
    "Attachments" | "File" | "Calculated" | "Counter" | "Computed" |
    "Geolocation" | "Recurrence" | "CrossProjectLink" | "AllDayEvent" | "Integer" |
    /** OutcomeChoice from workflow task outcome modified PercentComplete and Stauts fields */
    "OutcomeChoice" |
    /** Thumbnail is an image field, see issue 7553 */
    "Thumbnail"
    |
    /** Location field */
    "Location";
export interface IFieldInfoEX extends IFieldInfo {
    TypeAsString: FieldTypeAsString;
    SchemaJson: IFieldJsonSchema;
    OutputTypeAsString: FieldTypeAsString;
}
export interface IFieldInfoExHash { [InternalName: string]: IFieldInfoEX; }

export interface IFieldContentType extends IFieldInfoEX {
    Options: IContentTypeInfo[];
}
export interface IFieldNoteInfo extends IFieldInfoEX {
    RichText: boolean;
    NumberOfLines: number;
    AppendOnly: boolean;
}
export interface IFieldUrlInfo extends IFieldInfoEX {
    DisplayFormat: UrlFieldFormatType;
}
export interface IFieldLookupInfo extends IFieldInfoEX {
    AllowMultipleValues: boolean;
    LookupField: string;
    LookupList: string;
    LookupWebId: string;
}

export interface IFieldUserInfo extends IFieldInfoEX {
    AllowMultipleValues: boolean;
    Presence: boolean;
    SelectionMode: PersonSelectionMode;
    SelectionGroup: number;
}
export interface IFieldDateTimeInfo extends IFieldInfoEX {
    DisplayFormat: DateTimeFieldFormatType;
    FriendlyDisplayFormat: DateTimeFieldFriendlyFormatType;
}
export interface IFieldTaxonomyInfo extends IFieldLookupInfo {
    CreateValuesInEditForm: boolean;
    IsAnchorValid: boolean;
    IsKeyword: boolean;
    IsPathRendered: boolean;
    IsTermSetValid: boolean;
    Open: boolean;
    SspId: string;
    TermSetId: string;
    AnchorId: string;
    /** The hidden text field id used to update multi value.
     * Warning: Issue 7585 do not use this.
     * Instead use UpdateMultiTaxonomyValue endpoint
     */
    TextField: string;
    UserCreated: boolean;
    /** The hidden text field internal name used to update multi value.
     * Warning: Issue 7585 do not use this.
     * Instead use UpdateMultiTaxonomyValue endpoint
     */
    HiddenMultiValueFieldName: string;
}
export interface IFieldNumberInfo extends IFieldInfoEX {
    /** number of decimals to show. -1 for automatic. */
    DisplayFormat: number;
    ShowAsPercentage: boolean;
    MinimumValue: number;
    MaximumValue: number;
}
export interface IFieldCurrencyInfo extends IFieldNumberInfo {
    CurrencyLocaleId: number;
}
export interface IFieldChoiceInfo extends IFieldInfoEX {
    Choices: string[];
    FillInChoice: boolean;
    EditFormat: ChoiceFieldFormatType;
}

export interface IFieldCalculatedInfo extends IFieldInfoEX {
    OutputType: FieldTypes.Boolean | FieldTypes.Currency | FieldTypes.DateTime | FieldTypes.Number | FieldTypes.Text;
    DateFormat?: DateTimeFieldFormatType;
    ShowAsPercentage?: boolean;
}

export type UrlValueType = { Url: string; Description?: string; };
export type TaxonomyValueType = { Label?: string; TermGuid?: string; WssId: number; };
export type ThumbnailValueType = {
    type?: "thumbnail";
    fileName: string;
    fieldName?: string;
    serverUrl: string;//example: "https://kwizcom.sharepoint.com"
    serverRelativeUrl: string;//"/sites/n2/dvp/SiteAssets/Lists/6fb9e25a-a709-4ecd-aba1-e61efd8ec8e6/gas-chainsaw-20.jpg",
    id: string;//guid, like "6698ff8d-8f08-4c58-a917-ed65a6cf53d0"
};

export type RententionLabelFieldValueType = {
    TagId: string;
    TagName: string;
};

// eslint-disable-next-line no-shadow
export enum RoleType {
    none,
    guest,
    reader,
    contributor,
    webDesigner,
    administrator,
    editor
}

// eslint-disable-next-line no-shadow
export enum SPEventReceiverTypes {
    invalidReceiver = -1,
    itemAdding = 1,
    itemUpdating = 2,
    itemDeleting = 3,
    itemCheckingIn = 4,
    itemCheckingOut = 5,
    itemUncheckingOut = 6,
    itemAttachmentAdding = 7,
    itemAttachmentDeleting = 8,
    itemFileMoving = 9,
    itemVersionDeleting = 11,
    fieldAdding = 101,
    fieldUpdating = 102,
    fieldDeleting = 103,
    listAdding = 104,
    listDeleting = 105,
    siteDeleting = 201,
    webDeleting = 202,
    webMoving = 203,
    webAdding = 204,
    siteMovingFromGeoLocation = 206,
    groupAdding = 301,
    groupUpdating = 302,
    groupDeleting = 303,
    groupUserAdding = 304,
    groupUserDeleting = 305,
    roleDefinitionAdding = 306,
    roleDefinitionUpdating = 307,
    roleDefinitionDeleting = 308,
    roleAssignmentAdding = 309,
    roleAssignmentDeleting = 310,
    inheritanceBreaking = 311,
    inheritanceResetting = 312,
    workflowStarting = 501,
    itemAdded = 10001,
    itemUpdated = 10002,
    itemDeleted = 10003,
    itemCheckedIn = 10004,
    itemCheckedOut = 10005,
    itemUncheckedOut = 10006,
    itemAttachmentAdded = 10007,
    itemAttachmentDeleted = 10008,
    itemFileMoved = 10009,
    itemFileConverted = 10010,
    itemVersionDeleted = 10011,
    fieldAdded = 10101,
    fieldUpdated = 10102,
    fieldDeleted = 10103,
    listAdded = 10104,
    listDeleted = 10105,
    siteDeleted = 10201,
    webDeleted = 10202,
    webRestored = 10205,
    webMoved = 10203,
    webProvisioned = 10204,
    groupAdded = 10301,
    groupUpdated = 10302,
    groupDeleted = 10303,
    groupUserAdded = 10304,
    groupUserDeleted = 10305,
    roleDefinitionAdded = 10306,
    roleDefinitionUpdated = 10307,
    roleDefinitionDeleted = 10308,
    roleAssignmentAdded = 10309,
    roleAssignmentDeleted = 10310,
    inheritanceBroken = 10311,
    inheritanceReset = 10312,
    workflowStarted = 10501,
    workflowPostponed = 10502,
    workflowCompleted = 10503,
    entityInstanceAdded = 10601,
    entityInstanceUpdated = 10602,
    entityInstanceDeleted = 10603,
    appInstalled = 10701,
    appUpgraded = 10702,
    appUninstalling = 10703,
    emailReceived = 20000,
    contextEvent = 32766
}

export interface ISPEventReceiver {
    EventType: SPEventReceiverTypes;
    ReceiverAssembly: string;
    ReceiverClass: string;
    ReceiverId: string;
    ReceiverName: string;
    ReceiverUrl: string;
    SequenceNumber: number;
    Synchronization: number;
}

export interface IContextWebInformation {
    FormDigestTimeoutSeconds: number;
    FormDigestValue: string;
    LibraryVersion: string;
    SiteFullUrl: string;
    WebFullUrl: string;
}

// eslint-disable-next-line no-shadow
export enum SPFxDisplayMode {
    Read = 1,
    Edit = 2,
}

/** SharePoint calendar list item EventType */
// eslint-disable-next-line no-shadow
export enum SPCalendarEventType {
    SingleEvent = 0,
    RecurringEvent = 1,
    /** A recurrence instance that was deleted */
    RecurrenceDeleted = 3,
    /** A recurrence instance that was modified */
    RecurrenceException = 4
}

// eslint-disable-next-line no-shadow
export enum SPDateTimeDisplayFormat {
    DateOnly,
    DateTime,
    TimeOnly
}

// eslint-disable-next-line no-shadow
export enum SPDateTimeCalendarType {
    None,
    Gregorian,
    Japan,
    Taiwan,
    Korea,
    Hijri,
    Thai,
    Hebrew,
    GregorianMEFrench,
    GregorianArabic,
    GregorianXLITEnglish,
    GregorianXLITFrench,
    KoreaJapanLunar,
    ChineseLunar,
    SakaEra,
    UmAlQura
}

// eslint-disable-next-line no-shadow
export enum SPJsGridEditMode {
    ReadOnly, // 0,
    ReadWrite, // 1,
    ReadOnlyDefer, // 2,
    ReadWriteDefer, // 3,
    Defer // 4
}

//full name is SP.JsGrid.JsGridControl
export interface ISPJsGridControl {
    GetColumns(optPaneId?: string): {
        /** Column title */
        name: string;
        /** Column identifier */
        columnKey: string;
        /** this is used when you need to make some of the cells in the column readonly, but at the same time keep others editable */
        fnGetCellEditMode: (record: any, fieldKey: string) => SPJsGridEditMode;
    }[];
    /** Hide the specified column from grid */
    HideColumn(columnKey: string): void;
    /** Show a previously hidden column at a specified position.
        If atIdx is not defined, column will be shown at it's previous position. */
    ShowColumn(columnKey: string, atIdx?: number): void;
}

// eslint-disable-next-line no-shadow
export enum UserProfileBuiltinProperty {
    Department = "Department",
    DisplayName = "DisplayName",
    Email = "Email",
    FirstName = "FirstName",
    HireDate = "HireDate",
    JobTitle = "JobTitle",
    Manager = "Manager",
    MobilePhone = "MobilePhone",
    Office = "Office",
    Phone = "Phone",
    WorkEmail = "WorkEmail",
    WorkPhone = "WorkPhone"
}

// eslint-disable-next-line no-shadow
export enum BuiltInFields {
    Attachments = "Attachments",
    AttachmentFiles = "AttachmentFiles"
}
export type AttachmentFilesRESTValue = {
    results: {
        FileName: string;
        ServerRelativeUrl: string;
    }[];
};

interface _spPageContextInfo {
    aadTenantId: string; // Tennatn ID
    portalUrl: string;
    alertsEnabled: boolean; // true
    allowSilverlightPrompt: string; // "True"
    blockDownloadsExperienceEnabled: boolean; // true
    canUserCreateMicrosoftForm: boolean; // true
    cdnPrefix: string; // "static.sharepointonline.com/bld"
    clientServerTimeDelta: number; // -182
    CorrelationId: string; // "6161f99d-10e5-4000-ad30-1016270fe31d"
    crossDomainPhotosEnabled: boolean; // true
    currentCultureName: string; // "ru-RU"
    currentLanguage: number; // 1049
    currentUICultureName: string; // "ru-RU"
    disableAppViews: boolean; // true
    disableFlows: boolean; // true
    env: string; // "prod"
    farmLabel: string; // "US_4_Content"
    formDigestValue: string; // "0x5F3FE84E7EE9089C7D11DCDAFFB9E69CF8241E68B9EF071FA92CD419E878AC4F7C16E34696EFA667EFD0712FC1DF4945DDC0D09B5D23153A698A727AF076B5DE,07 Jun 2017 18:55:22 -0000"
    formDigestTimeoutSeconds: number; // 1800
    groupColor: string; // "#d40ac7"
    groupHasHomepage: boolean; // true
    groupId: string; //
    guestsEnabled: boolean; // true
    hasManageWebPermissions: boolean; // true
    isAnonymousGuestUser: boolean; // true
    isAppWeb: boolean; // true
    isExternalGuestUser: boolean; // true
    isNoScriptEnabled: boolean; // true
    isSiteAdmin: boolean; // true
    isSPO: boolean; // true
    isTenantDevSite: boolean; // true
    isWebWelcomePage: boolean; // true
    layoutsUrl: string; // "_layouts/15"
    listBaseTemplate: number; // 119
    listId: string; // "{06ee6d96-f27f-4160-b6bb-c18f187b18a7}"
    listPermsMask: { High: number; Low: number };
    listTitle: string; // "Site Pages"
    listUrl: string; // "/sites/site/list"
    maximumFileSize: number; // 15360
    openInClient: boolean; // true
    pageListId: string; // "{06ee6d96-f27f-4160-b6bb-c18f187b18a7}"
    pageItemId: number;
    pagePermsMask: { High: number; Low: number };
    pagePersonalizationScope: string; // 1
    PreviewFeaturesEnabled: boolean; // true
    preferUserTimeZone: boolean; // false
    ProfileUrl: string; // "https://tenant-my.sharepoint.com/person.aspx"
    PublishingFeatureOn: boolean; // true
    RecycleBinItemCount: number; // -1
    serverRedirectedUrl: string;
    serverRequestPath: string; // "/SPTypeScript/Lists/ConditionalFormattingTasksList/AllItems.aspx"
    serverTime: string; // "2017-06-07T18:55:22.3499459Z"
    siteAbsoluteUrl: string; // "https:// gandjustas-7b20d3715e8ed4.sharepoint.com"
    siteClassification: string; //
    siteClientTag: string; // "0$$15.0.4454.1021"
    siteColor: string; // "#d40ac7"
    siteId: string; // "{3e09a056-f68f-44a3-8e0f-ff2c123b82cb}"
    sitePagesEnabled: boolean; // true
    siteServerRelativeUrl: string; // "/"
    siteSubscriptionId: string; // 4eedf5f3-f71f-4e73-82ee-e19081363c8c
    supportPoundStorePath: boolean; // true
    supportPercentStorePath: boolean; // true
    systemUserKey: string; // "i:0h.f|membership|10033fff84e7cb2b@live.com"
    tenantAppVersion: string; // "0"
    themeCacheToken: string; // "/sites/site::0:16.0.6525.1206"
    themedCssFolderUrl: string;
    themedImageFileNames: string;
    updateFormDigestPageLoaded: string; // "2017-06-07T18:55:25.821Z"
    userDisplayName: string; // "John Doe"
    userEmail: string; // "john.doe@fabrikam.onmicrosoft.com"
    userId: number; // 12
    userLoginName: string; // "john.doe@fabrikam.onmicrosoft.com"
    userPrincipalName: string;
    viewOnlyExperienceEnabled: boolean; // true
    viewId: string; // "{06ee6d96-f27f-4160-b6bb-c18f187b18a7}"
    webAbsoluteUrl: string; // "https:// gandjustas-7b20d3715e8ed4.sharepoint.com/SPTypeScript"
    webDescription: string; // "Some description"
    webId: string; // "{06ee6d96-f27f-4160-b6bb-c18f187b18a7}"
    webLanguage: number; // 1049
    webLogoUrl: string; // "/_layouts/15/images/siteIcon.png?rev=23"
    webPermMasks: { High: number; Low: number };
    webServerRelativeUrl: string; // "/SPTypeScript"
    webTemplate: string; // "17"
    webTitle: string; // "SPTypeScript"
    webUIVersion: number; // 15
}
declare global {
    var _spPageContextInfo: _spPageContextInfo;
}

export enum SPClientControlMode {
    Invalid,
    DisplayForm,
    EditForm,
    NewForm,
    View
}

export type IRententionLabel = {
    AcceptMessagesOnlyFromSendersOrMembers: boolean;
    AccessType: string;
    AllowAccessFromUnmanagedDevice: string;
    AutoDelete: boolean;
    BlockDelete: boolean;
    BlockEdit: boolean;
    ComplianceFlags: number;
    ContainsSiteLabel: boolean;
    DisplayName: string;
    EncryptionRMSTemplateId: string;
    HasRetentionAction: boolean;
    IsEventTag: boolean;
    MultiStageReviewerEmail: string;
    NextStageComplianceTag: string;
    Notes: string;
    RequireSenderAuthenticationEnabled: boolean;
    ReviewerEmail: string;
    SharingCapabilities: string;
    SuperLock: boolean;
    TagDuration: number;
    TagId: string;
    TagName: string;
    TagRetentionBasedOn: string;
    UnlockedAsDefault: boolean;
}

export type spNavLinkLocation = "quicklaunch" | "topnavigationbar" | "none";

export interface INavLinkInfo {
    Id: number;
    IsDocLib: boolean;
    IsExternal: boolean;
    IsVisible: boolean;
    Title: string;
    Url: string;
    Location: spNavLinkLocation;
}