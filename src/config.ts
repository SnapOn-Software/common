import { SetDependencies } from './_dependencies';
import { releasetypes } from './exports-index';
import { ConsoleLogger } from './utils/consolelogger';

export interface iConfigParams {
    BuildNumber?: string;
    ReleaseStatus?: releasetypes;
};
export function config(params: iConfigParams & {
    ProjectName?: string;
    /** @deprecated use ReleaseStatus="dev" */
    IsLocalDev?: boolean;
}) {
    SetDependencies(params);
    function GetLogger(name: string) {
        return ConsoleLogger.get(name, params.ProjectName);
    }
    return {
        GetLogger,
        /** @deprecated exported as GetLogger, which is how is used anyways  */
        logger: GetLogger
    }
}

export { BuildNumber, IsFastRing, IsLocalDev, IsProduction, ReleaseStatus } from "./_dependencies";