import CryptoJS from 'crypto-js';
import { CommonLogger } from '../common-logger';
import { shiftDate } from './date';
import { GetError } from './objects';
import { isDate, isNumber } from './typecheckers';
import { IDictionary } from "../types/common.types";

const logger = new CommonLogger("crypto");

function toBase64Url(base64: string) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeUtf8(value: string) {
    const wordArray = CryptoJS.enc.Utf8.parse(value);
    const base64 = CryptoJS.enc.Base64.stringify(wordArray);
    return toBase64Url(base64);
}

function fromBase64Url(base64Url: string) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return `${base64}${padding}`;
}

function base64UrlDecodeUtf8(value: string) {
    const base64 = fromBase64Url(value);
    const wordArray = CryptoJS.enc.Base64.parse(base64);
    return CryptoJS.enc.Utf8.stringify(wordArray);
}

/** use the jose library from @kwiz/node for server apps */
export async function sign<T extends IDictionary<string | number | boolean | string[]>>(jwtSecret: string, payload: T, options?: { exp?: number | string | Date; }) {
    const header = { alg: "HS256", typ: "JWT" };
    const iat = Math.floor(Date.now() / 1000);
    const exp = isNumber(options?.exp)
        ? options?.exp
        : isDate(options?.exp)
            ? Math.floor(options.exp.getTime() / 1000)
            : Math.floor(shiftDate("h1").getTime() / 1000);

    const base64Header = base64UrlEncodeUtf8(JSON.stringify(header));
    const base64Payload = base64UrlEncodeUtf8(JSON.stringify({
        ...payload,
        iat, exp
    }));
    const unsignedToken = `${base64Header}.${base64Payload}`;

    const signatureBase64 = CryptoJS.HmacSHA256(unsignedToken, jwtSecret).toString(CryptoJS.enc.Base64);
    const signature = toBase64Url(signatureBase64);

    const token = `${unsignedToken}.${signature}`;
    return token;
}
/** use the jose library from @kwiz/node for server apps */
export async function unsign<T>(jwtSecret: string, token: string) {
    try {
        if (!token) {
            throw new Error("Invalid token");
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error("Invalid token");
        }

        const [base64Header, base64Payload, signature] = parts;
        const unsignedToken = `${base64Header}.${base64Payload}`;
        const expectedSignatureBase64 = CryptoJS.HmacSHA256(unsignedToken, jwtSecret).toString(CryptoJS.enc.Base64);
        const expectedSignature = toBase64Url(expectedSignatureBase64);

        if (expectedSignature !== signature) {
            throw new Error("Invalid token signature");
        }

        let parsedPayload: any;
        try {
            const payloadJson = base64UrlDecodeUtf8(base64Payload);
            parsedPayload = JSON.parse(payloadJson);
        } catch {
            throw new Error("Invalid token payload");
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        const expValue = parsedPayload?.exp;
        const expSeconds = isNumber(expValue)
            ? expValue
            : isDate(expValue)
                ? Math.floor(expValue.getTime() / 1000)
                : Number(expValue);

        if (!Number.isNaN(expSeconds) && nowSeconds >= expSeconds) {
            throw new Error("Token expired");
        }

        return parsedPayload as T;
    } catch (e) {
        logger.error(GetError(e));
        return null;
    }
}