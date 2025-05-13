import { isISODate, isISODateUTC } from "../../helpers/date";
import { isDate, isNullOrEmptyString, isNullOrUndefined } from "../../helpers/typecheckers";
import { DateOrNull } from "../../types/common.types";
import { toIsoDateFormat } from "../date";
import { LocaleKnownScript } from "../knownscript";
import { SPServerLocalTimeToUTCSync } from "./web";
import { hasGlobalContext } from "./common";

function _SPServerLocalTimeToUTC(dateValueStr: string) {
    if (hasGlobalContext()) {
        //yyyy-MM-ddTHH:mm or SPServerLocalTime (5/27/2021 11:34) to UTC
        let utcTimeValue = SPServerLocalTimeToUTCSync(_spPageContextInfo.webServerRelativeUrl, dateValueStr);

        if (!isNullOrEmptyString(utcTimeValue)) {
            return new Date(utcTimeValue);
        }
    }
    return null;
}

export function parseDate(value: string | Date): DateOrNull {
    if (isNullOrUndefined(value) || (isNullOrEmptyString(value) && !isDate(value))) {
        return null;
    }

    let dateValueStr = isDate(value) ? value.toISOString() : value;

    var valueAsDate: DateOrNull = null;

    if (isISODateUTC(dateValueStr)) {
        valueAsDate = new Date(dateValueStr);
    } else if (isISODate(dateValueStr)) {
        //yyyy-MM-ddTHH:mm or SPServerLocalTime (5/27/2021 11:34) to UTC
        valueAsDate = _SPServerLocalTimeToUTC(dateValueStr);
    } else {
        //Don't think this is necessary because the SPServerLocalTimeToUTCSync can accept date strings in non ISO format (5/27/2021 11:34)
        var dateParts: string[] = dateValueStr.split(" ");
        if (dateParts.length) {
            let locales = LocaleKnownScript.loadSync();

            valueAsDate = locales.ParseDate(dateValueStr);
            dateValueStr = toIsoDateFormat(valueAsDate, { omitZ: true });
            valueAsDate = _SPServerLocalTimeToUTC(dateValueStr);

            if (valueAsDate instanceof Date && dateParts.length === 2) {
                var time = dateParts[1];
                if (time.length) {
                    var timeParts = locales.GetCurrentCulture() ? locales.GetCurrentCulture().dateTimeFormat.TimeSeparator : ":";
                    if (timeParts.length === 2) {
                        var hours = Number(timeParts[0]);
                        var minutes = Number(timeParts[1]);

                        valueAsDate.setHours(hours);
                        valueAsDate.setMinutes(minutes);
                    }
                }
            }
        }
    }

    if (!valueAsDate) {
        valueAsDate = new Date(dateValueStr);
    }

    return isDate(valueAsDate) ? valueAsDate : null;
}