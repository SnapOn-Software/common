import { kwiz_cdn_hostname_production } from "./constants";

//don't use kwiz_cdn_root since this might be saved in settings
const prefix = `https://${kwiz_cdn_hostname_production}/products/common/images/`;

export const LOGO_ANIM_SMALL = `${prefix}logo/anim-small.gif`;
export const LOGO_ANIM = `${prefix}logo/anim.gif`;

export const LOGO_BLACK_HORIZONTAL = `${prefix}logo/black/horizontal.png`;
export const LOGO_BLACK_SQUARE = `${prefix}logo/black/square.png`;
export const LOGO_BLACK_VERTICAL = `${prefix}logo/black/vertical.png`;

export const LOGO_BLUE_HORIZONTAL = `${prefix}logo/blue/horizontal.png`;
export const LOGO_BLUE_SQUARE = `${prefix}logo/blue/square.png`;
export const LOGO_BLUE_VERTICAL = `${prefix}logo/blue/vertical.png`;

export const LOGO_CYAN_HORIZONTAL = `${prefix}logo/cyan/horizontal.png`;
export const LOGO_CYAN_VERTICAL = `${prefix}logo/cyan/vertical.png`;

export const LOGO_GRAD_HORIZONTAL = `${prefix}logo/grad/horizontal.png`;
export const LOGO_GRAD_SQUARE = `${prefix}logo/grad/square.png`;
export const LOGO_GRAD_VERTICAL = `${prefix}logo/grad/vertical.png`;

export const LOGO_WHITE_HORIZONTAL = `${prefix}logo/white/horizontal.png`;
export const LOGO_WHITE_SQUARE = `${prefix}logo/white/square.png`;
export const LOGO_WHITE_VERTICAL = `${prefix}logo/white/vertical.png`;