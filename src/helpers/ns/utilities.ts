import { tnsCountry } from "../../types/ns/ns.countries";
import { insObject, insSuiteTalkRestErrorData, tnsField } from "../../types/ns/ns.types";
import { firstOrNull } from "../collections.base";
import { isNotEmptyArray, isNotEmptyString, isNullOrEmptyString } from "../typecheckers";
import { isnsSuiteTalkRestErrorData } from "./type-checkers";

const nsEndpointHosts = {
    suitetalk: '.suitetalk.api.netsuite.com',
    restlets: '.restlets.api.netsuite.com',
    ui: '.app.netsuite.com'
};

export function getNSAccuntUrlPrefix(accountId: string) {
    return accountId.replace('_', '-').toLowerCase();
}
export function getNSSuitetalkApiHost(accountId: string) {
    return `https://${getNSAccuntUrlPrefix(accountId)}${nsEndpointHosts.suitetalk}`;
}
export function getNSRestletsApiHost(accountId: string) {
    return `https://${getNSAccuntUrlPrefix(accountId)}${nsEndpointHosts.restlets}`;
}
export function getNSIUHost(accountId: string) {
    return `https://${getNSAccuntUrlPrefix(accountId)}${nsEndpointHosts.ui}`;
}

/** send in either an AxiosError that has a response.data object, or just the data object itself. */
export function nsGetErrorDetails(error: any) {
    const data: insSuiteTalkRestErrorData = isnsSuiteTalkRestErrorData(error)
        ? error
        : isnsSuiteTalkRestErrorData(error?.response?.data)
            ? error.response.data
            : null;
    return data;
}

const ignoreSuffixIfDuplicate = ["WithHierarchy", "Copy", "Display"];
export function nsFieldEditableFilter(field: tnsField, allFields?: string[]) {
    if (isNullOrEmptyString(field.title)
        || field.readOnly
        || ['id', 'createdDate', 'lastModifiedDate', 'externalId', 'refName'].includes(field.name))
        return false;
    if (isNotEmptyArray(allFields)) {
        const ending = firstOrNull(ignoreSuffixIfDuplicate, suffix => field.name.endsWith(suffix));
        if (isNotEmptyString(ending) && allFields.includes(field.name.slice(0, -1 * ending.length)))//got the field without the ending
            return false;
    }
    return true;
}

export function nsObjectFilter(obj: insObject) {
    return isNotEmptyString(obj.name);
}
export function nsIsFeaturedObject(obj: insObject) {
    return false;
}

export function NSCountryToText(country: tnsCountry): string {
    if (!isNullOrEmptyString(country) && country.startsWith("_")) {
        //insert space before each capital letter
        let name = "";
        //start from 1 to ignore _ prefix
        for (let i = 1; i < country.length; i++) {
            if (country[i] === country[i].toUpperCase()) name += " ";
            //capitalize first word
            name += i === 1 ? country[i].toUpperCase() : country[i];
        }
        return name;
    }
    return "";
}

export var NSCountries: {
    [key in tnsCountry]: string[]
} = { "": [], _afghanistan: ["afghanistan"], _alandIslands: ["aland", "islands"], _albania: ["albania"], _algeria: ["algeria"], _americanSamoa: ["american", "samoa"], _andorra: ["andorra"], _angola: ["angola"], _anguilla: ["anguilla"], _antarctica: ["antarctica"], _antiguaAndBarbuda: ["antigua", "and", "barbuda"], _argentina: ["argentina"], _armenia: ["armenia"], _aruba: ["aruba"], _australia: ["australia"], _austria: ["austria"], _azerbaijan: ["azerbaijan"], _bahamas: ["bahamas"], _bahrain: ["bahrain"], _bangladesh: ["bangladesh"], _barbados: ["barbados"], _belarus: ["belarus"], _belgium: ["belgium"], _belize: ["belize"], _benin: ["benin"], _bermuda: ["bermuda"], _bhutan: ["bhutan"], _bolivia: ["bolivia"], _bonaireSaintEustatiusAndSaba: ["bonaire", "saint", "eustatius", "and", "saba"], _bosniaAndHerzegovina: ["bosnia", "and", "herzegovina"], _botswana: ["botswana"], _bouvetIsland: ["bouvet", "island"], _brazil: ["brazil"], _britishIndianOceanTerritory: ["british", "indian", "ocean", "territory"], _bruneiDarussalam: ["brunei", "darussalam"], _bulgaria: ["bulgaria"], _burkinaFaso: ["burkina", "faso"], _burundi: ["burundi"], _cambodia: ["cambodia"], _cameroon: ["cameroon"], _canada: ["canada"], _canaryIslands: ["canary", "islands"], _capeVerde: ["cape", "verde"], _caymanIslands: ["cayman", "islands"], _centralAfricanRepublic: ["central", "african", "republic"], _ceutaAndMelilla: ["ceuta", "and", "melilla"], _chad: ["chad"], _chile: ["chile"], _china: ["china"], _christmasIsland: ["christmas", "island"], _cocosKeelingIslands: ["cocos", "keeling", "islands"], _colombia: ["colombia"], _comoros: ["comoros"], _congoDemocraticPeoplesRepublic: ["congo", "democratic", "peoples", "republic"], _congoRepublicOf: ["congo", "republic", "of"], _cookIslands: ["cook", "islands"], _costaRica: ["costa", "rica"], _coteDIvoire: ["cote", "d", "ivoire"], _croatiaHrvatska: ["croatia", "hrvatska"], _cuba: ["cuba"], _curacao: ["curacao"], _cyprus: ["cyprus"], _czechRepublic: ["czech", "republic"], _denmark: ["denmark"], _djibouti: ["djibouti"], _dominica: ["dominica"], _dominicanRepublic: ["dominican", "republic"], _eastTimor: ["east", "timor"], _ecuador: ["ecuador"], _egypt: ["egypt"], _elSalvador: ["el", "salvador"], _equatorialGuinea: ["equatorial", "guinea"], _eritrea: ["eritrea"], _estonia: ["estonia"], _ethiopia: ["ethiopia"], _falklandIslands: ["falkland", "islands"], _faroeIslands: ["faroe", "islands"], _fiji: ["fiji"], _finland: ["finland"], _france: ["france"], _frenchGuiana: ["french", "guiana"], _frenchPolynesia: ["french", "polynesia"], _frenchSouthernTerritories: ["french", "southern", "territories"], _gabon: ["gabon"], _gambia: ["gambia"], _georgia: ["georgia"], _germany: ["germany"], _ghana: ["ghana"], _gibraltar: ["gibraltar"], _greece: ["greece"], _greenland: ["greenland"], _grenada: ["grenada"], _guadeloupe: ["guadeloupe"], _guam: ["guam"], _guatemala: ["guatemala"], _guernsey: ["guernsey"], _guinea: ["guinea"], _guineaBissau: ["guinea", "bissau"], _guyana: ["guyana"], _haiti: ["haiti"], _heardAndMcDonaldIslands: ["heard", "and", "mc", "donald", "islands"], _holySeeCityVaticanState: ["holy", "see", "city", "vatican", "state"], _honduras: ["honduras"], _hongKong: ["hong", "kong"], _hungary: ["hungary"], _iceland: ["iceland"], _india: ["india"], _indonesia: ["indonesia"], _iranIslamicRepublicOf: ["iran", "islamic", "republic", "of"], _iraq: ["iraq"], _ireland: ["ireland"], _isleOfMan: ["isle", "of", "man"], _israel: ["israel"], _italy: ["italy"], _jamaica: ["jamaica"], _japan: ["japan"], _jersey: ["jersey"], _jordan: ["jordan"], _kazakhstan: ["kazakhstan"], _kenya: ["kenya"], _kiribati: ["kiribati"], _koreaDemocraticPeoplesRepublic: ["korea", "democratic", "peoples", "republic"], _koreaRepublicOf: ["korea", "republic", "of"], _kosovo: ["kosovo"], _kuwait: ["kuwait"], _kyrgyzstan: ["kyrgyzstan"], _laoPeoplesDemocraticRepublic: ["lao", "peoples", "democratic", "republic"], _latvia: ["latvia"], _lebanon: ["lebanon"], _lesotho: ["lesotho"], _liberia: ["liberia"], _libya: ["libya"], _liechtenstein: ["liechtenstein"], _lithuania: ["lithuania"], _luxembourg: ["luxembourg"], _macau: ["macau"], _macedonia: ["macedonia"], _madagascar: ["madagascar"], _malawi: ["malawi"], _malaysia: ["malaysia"], _maldives: ["maldives"], _mali: ["mali"], _malta: ["malta"], _marshallIslands: ["marshall", "islands"], _martinique: ["martinique"], _mauritania: ["mauritania"], _mauritius: ["mauritius"], _mayotte: ["mayotte"], _mexico: ["mexico"], _micronesiaFederalStateOf: ["micronesia", "federal", "state", "of"], _moldovaRepublicOf: ["moldova", "republic", "of"], _monaco: ["monaco"], _mongolia: ["mongolia"], _montenegro: ["montenegro"], _montserrat: ["montserrat"], _morocco: ["morocco"], _mozambique: ["mozambique"], _myanmar: ["myanmar"], _namibia: ["namibia"], _nauru: ["nauru"], _nepal: ["nepal"], _netherlands: ["netherlands"], _newCaledonia: ["new", "caledonia"], _newZealand: ["new", "zealand"], _nicaragua: ["nicaragua"], _niger: ["niger"], _nigeria: ["nigeria"], _niue: ["niue"], _norfolkIsland: ["norfolk", "island"], _northernMarianaIslands: ["northern", "mariana", "islands"], _norway: ["norway"], _oman: ["oman"], _pakistan: ["pakistan"], _palau: ["palau"], _panama: ["panama"], _papuaNewGuinea: ["papua", "new", "guinea"], _paraguay: ["paraguay"], _peru: ["peru"], _philippines: ["philippines"], _pitcairnIsland: ["pitcairn", "island"], _poland: ["poland"], _portugal: ["portugal"], _puertoRico: ["puerto", "rico"], _qatar: ["qatar"], _reunionIsland: ["reunion", "island"], _romania: ["romania"], _russianFederation: ["russian", "federation"], _rwanda: ["rwanda"], _saintBarthelemy: ["saint", "barthelemy"], _saintHelena: ["saint", "helena"], _saintKittsAndNevis: ["saint", "kitts", "and", "nevis"], _saintLucia: ["saint", "lucia"], _saintMartin: ["saint", "martin"], _saintVincentAndTheGrenadines: ["saint", "vincent", "and", "the", "grenadines"], _samoa: ["samoa"], _sanMarino: ["san", "marino"], _saoTomeAndPrincipe: ["sao", "tome", "and", "principe"], _saudiArabia: ["saudi", "arabia"], _senegal: ["senegal"], _serbia: ["serbia"], _seychelles: ["seychelles"], _sierraLeone: ["sierra", "leone"], _singapore: ["singapore"], _sintMaarten: ["sint", "maarten"], _slovakRepublic: ["slovak", "republic"], _slovenia: ["slovenia"], _solomonIslands: ["solomon", "islands"], _somalia: ["somalia"], _southAfrica: ["south", "africa"], _southGeorgia: ["south", "georgia"], _southSudan: ["south", "sudan"], _spain: ["spain"], _sriLanka: ["sri", "lanka"], _stateOfPalestine: ["state", "of", "palestine"], _stPierreAndMiquelon: ["st", "pierre", "and", "miquelon"], _sudan: ["sudan"], _suriname: ["suriname"], _svalbardAndJanMayenIslands: ["svalbard", "and", "jan", "mayen", "islands"], _swaziland: ["swaziland"], _sweden: ["sweden"], _switzerland: ["switzerland"], _syrianArabRepublic: ["syrian", "arab", "republic"], _taiwan: ["taiwan"], _tajikistan: ["tajikistan"], _tanzania: ["tanzania"], _thailand: ["thailand"], _togo: ["togo"], _tokelau: ["tokelau"], _tonga: ["tonga"], _trinidadAndTobago: ["trinidad", "and", "tobago"], _tunisia: ["tunisia"], _turkey: ["turkey"], _turkmenistan: ["turkmenistan"], _turksAndCaicosIslands: ["turks", "and", "caicos", "islands"], _tuvalu: ["tuvalu"], _uganda: ["uganda"], _ukraine: ["ukraine"], _unitedArabEmirates: ["united", "arab", "emirates"], _unitedKingdom: ["united", "kingdom"], _unitedStates: ["united", "states", "usa", "us"], _uruguay: ["uruguay"], _uSMinorOutlyingIslands: ["u", "s", "minor", "outlying", "islands"], _uzbekistan: ["uzbekistan"], _vanuatu: ["vanuatu"], _venezuela: ["venezuela"], _vietnam: ["vietnam"], _virginIslandsBritish: ["virgin", "islands", "british"], _virginIslandsUSA: ["virgin", "islands", "u", "s", "a"], _wallisAndFutunaIslands: ["wallis", "and", "futuna", "islands"], _westernSahara: ["western", "sahara"], _yemen: ["yemen"], _zambia: ["zambia"], _zimbabwe: ["zimbabwe"] };

export function TextToNSCountry(country: string): tnsCountry {
    if (isNullOrEmptyString(country)) return "";

    let lowerWords = country.toLowerCase().split(" ");
    //try to find the best match, until we are left with one option
    let allOptions = Object.keys(NSCountries) as tnsCountry[];
    let validOptions: tnsCountry[] = allOptions;

    for (let i = 0; i < lowerWords.length && validOptions.length > 1; i++) {
        let word = lowerWords[i];
        let newOptions = validOptions.filter(o => NSCountries[o].includes(word));
        if (newOptions.length > 0)//not empty - use this list
            validOptions = newOptions;
    }

    //done my loop. if I have more than 1 option - pick the best one.
    if (validOptions.length === 0 || validOptions.length === allOptions.length) return "";//none found
    else if (validOptions.length === 1) return validOptions[0];
    else {
        //return the one with the fewest words, since its the best match.
        //example, if user typed "atlantis" and we have "republic of atlantis" and "atlantis", he would get "atlantis" unless he mentiones "republic" as well
        let option = validOptions[0];
        validOptions.forEach(o => { if (NSCountries[o].length < NSCountries[option].length) option = o });
        return option;
    }
}
