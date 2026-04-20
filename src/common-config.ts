import { getGlobal } from './helpers/objects';
import { iConfigInfo } from './types/config.typs';

/** Entry point must call config to initialize this. Always access .i property to get the latest project data */
export class CommonConfig {
    private constructor() { }
    public static get i(): iConfigInfo {
        return getGlobal<iConfigInfo>('@kwiz/common/configInfo', {
            BuildNumber: "unset",
            ReleaseStatus: "npm",
            IsLocalDev: false,
            IsFastRing: false,
            IsProduction: true,
            ProjectName: "[kw]",
            _configured: false
        });
    }
}