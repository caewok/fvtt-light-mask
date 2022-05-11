/* globals
libWrapper,
AmbientLight,
AmbientSound,
foundry
*/

"use strict";

// Patches

import { lightMaskActivateListeners } from "./renderAmbientLightConfig.js";
import { MODULE_ID } from "./const.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { customEdges } from "./customEdges.js";

export function registerLightMask() {
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");

  libWrapper.register(MODULE_ID, "AmbientLightConfig.defaultOptions", switchAmbientLightTemplate, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.getData", ambientSourceGetData, "WRAPPER");

  libWrapper.register(MODULE_ID, "AmbientSoundConfig.defaultOptions", switchAmbientSoundTemplate, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.getData", ambientSourceGetData, "WRAPPER");
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

function switchAmbientLightTemplate(wrapper) {
  const cfg = wrapper();
  cfg.template = `modules/${MODULE_ID}/templates/ambient-light-config.html`;
  return cfg;
}

function switchAmbientSoundTemplate(wrapper) {
  const cfg = wrapper();
  cfg.template = `modules/${MODULE_ID}/templates/sound-config.html`;
  return cfg;
}

function ambientSourceGetData(wrapper, options) {
  const data = wrapper(options);

  return foundry.utils.mergeObject(data, {
    shapes: {
      circle: "lightmask.Circle",
      polygon: "lightmask.RegularPolygon",
      star: "lightmask.RegularStar",
      none: "lightmask.None"
    }
  });
}
