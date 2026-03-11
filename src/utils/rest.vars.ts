import { IRestOptions } from "../types/rest.types";

/** cache for 1 day */
export const noLocalCache: IRestOptions = { allowCache: false };
/** cache for 1 days */
export const longLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 1 } };
/** cache for 2 days */
export const extraLongLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 2 } };
/** cache for 7 days */
export const weeekLongLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 7 } };
/** cache for 30 days */
export const monthLongLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { days: 30 } };
/** cache for 5 minutes */
export const shortLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { minutes: 5 } };
/** cache for 15 minutes */
export const mediumLocalCache: IRestOptions = { allowCache: true, localStorageExpiration: { minutes: 15 } };
