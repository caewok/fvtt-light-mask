/* globals
libWrapper,
AmbientLightConfig,
AmbientSoundConfig
*/

`use strict`;

// Patches

import { lightMaskActivateListeners, lightMaskDefaultOptions } from "./renderAmbientLightConfig.js";
import { MODULE_ID } from "./const.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { customEdges } from "./customEdges.js";

export function registerLightMask() {
  //libWrapper.register(MODULE_ID, `AmbientLightConfig.prototype._getSubmitData`, lightMaskGetSubmitData, 'WRAPPER');
  libWrapper.register(MODULE_ID, `AmbientLightConfig.prototype.activateListeners`, lightMaskActivateListeners, 'WRAPPER');
  libWrapper.register(MODULE_ID, `AmbientSoundConfig.prototype.activateListeners`, lightMaskActivateListeners, 'WRAPPER');

  libWrapper.register(MODULE_ID, `AmbientLightConfig.defaultOptions`, lightMaskDefaultOptions, 'WRAPPER');
  libWrapper.register(MODULE_ID, `AmbientSoundConfig.defaultOptions`, lightMaskDefaultOptions, 'WRAPPER');
}

Object.defineProperty(AmbientLight.prototype, "boundaryPolygon", {
  value: boundaryPolygon,
  writable: true,
  configurable: true
});

Object.defineProperty(AmbientSound.prototype, "boundaryPolygon", {
  value: boundaryPolygon,
  writable: true,
  configurable: true
});

Object.defineProperty(AmbientLight.prototype, "customEdges", {
  value: customEdges,
  writable: true,
  configurable: true
});

Object.defineProperty(AmbientSound.prototype, "customEdges", {
  value: customEdges,
  writable: true,
  configurable: true
});


