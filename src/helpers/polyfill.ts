
export function SetPolyfills() {
    try {
        if (!("String" in globalThis) || !("prototype" in String)) {
            return;
        }

        (String as any).format = (String as any).format || function () {
            return (String as any)._toFormattedString(false, arguments);
        };

        (String as any)._toFormattedString = (String as any)._toFormattedString || function (l, j) {
            var c = ""
                , e = j[0];
            for (var a = 0; true;) {
                var f = e.indexOf("{", a)
                    , d = e.indexOf("}", a);
                if (f < 0 && d < 0) {
                    c += e.slice(a);
                    break;
                }
                if (d > 0 && (d < f || f < 0)) {
                    c += e.slice(a, d + 1);
                    a = d + 2;
                    continue;
                }
                c += e.slice(a, f);
                a = f + 1;
                if (e.charAt(a) === "{") {
                    c += "{";
                    a++;
                    continue;
                }
                if (d < 0)
                    break;
                var h = e.substring(a, d)
                    , g = h.indexOf(":")
                    , k = parseInt(g < 0 ? h : h.substring(0, g), 10) + 1
                    , i = g < 0 ? "" : h.substring(g + 1)
                    , b = j[k];
                if (typeof b === "undefined" || b === null)
                    b = "";
                if (b.toFormattedString)
                    c += b.toFormattedString(i);
                else if (l && b.localeFormat)
                    c += b.localeFormat(i);
                else if (b.format)
                    c += b.format(i);
                else
                    c += b.toString();
                a = d + 1;
            }
            return c;
        };

        /**
         * String.prototype.splice() polyfill
         */
        if (!(String.prototype as any).splice) {
            Object.defineProperty(String.prototype, 'splice', {
                configurable: true,
                enumerable: false,
                writable: true,
                value: function (start, delCount, insert) {
                    return this.slice(0, start) + insert + this.slice(start + Math.abs(delCount));
                }
            });
        }
    } catch {
    }
}