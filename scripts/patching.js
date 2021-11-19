/* globals
libWrapper
*/

`use strict`;

// Patches

import { lightMaskInitializeLightSource } from "./initializeLightSource.js";
import { lightMaskGetSubmitData } from "./getSubmitData.js";
import { MODULE_ID } from "./const.js";
// import { log } from "./module.js";

export function registerLightMask() {
  libWrapper.register(MODULE_ID, 'LightSource.prototype.initialize', lightMaskInitializeLightSource, 'MIXED');
  libWrapper.register(MODULE_ID, `AmbientLightConfig.prototype._getSubmitData`, lightMaskGetSubmitData, 'WRAPPER');
}

