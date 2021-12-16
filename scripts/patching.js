/* globals
libWrapper,
AmbientLightConfig,
AmbientSoundConfig
*/

`use strict`;

// Patches

//import { lightMaskGetSubmitData } from "./getSubmitData.js";
import { lightMaskActivateListeners, lightMaskOnAddWallIDs, lightMaskOnCheckRelative } from "./renderAmbientLightConfig.js";
import { MODULE_ID } from "./const.js";
// import { log } from "./module.js";

export function registerLightMask() {
  //libWrapper.register(MODULE_ID, `AmbientLightConfig.prototype._getSubmitData`, lightMaskGetSubmitData, 'WRAPPER');
  libWrapper.register(MODULE_ID, `AmbientLightConfig.prototype.activateListeners`, lightMaskActivateListeners, 'WRAPPER');
  libWrapper.register(MODULE_ID, `AmbientSoundConfig.prototype.activateListeners`, lightMaskActivateListeners, 'WRAPPER');
  
}

Object.defineProperty(AmbientLightConfig.prototype, "_onAddWallIDs", {
  value: lightMaskOnAddWallIDs,
  writable: true,
  configurable: true
});

Object.defineProperty(AmbientSoundConfig.prototype, "_onAddWallIDs", {
  value: lightMaskOnAddWallIDs,
  writable: true,
  configurable: true
});

Object.defineProperty(AmbientLightConfig.prototype, "_onCheckRelative", {
  value: lightMaskOnCheckRelative,
  writable: true,
  configurable: true
});

Object.defineProperty(AmbientSoundConfig.prototype, "_onCheckRelative", {
  value: lightMaskOnCheckRelative,
  writable: true,
  configurable: true
});
