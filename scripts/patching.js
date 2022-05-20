/* globals
libWrapper,
AmbientLight,
LightSource,
SoundSource,
foundry
*/

"use strict";

// Patches

import { lightMaskActivateListeners } from "./renderAmbientLightConfig.js";
import { MODULE_ID } from "./settings.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { customEdges } from "./customEdges.js";
import { log } from "./module.js";

export function registerLightMask() {
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");

  libWrapper.register(MODULE_ID, "TokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");

  libWrapper.register(MODULE_ID, "AmbientLightConfig.defaultOptions", switchAmbientLightTemplate, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.getData", ambientSourceGetData, "WRAPPER");

  libWrapper.register(MODULE_ID, "AmbientSoundConfig.defaultOptions", switchAmbientSoundTemplate, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.getData", ambientSourceGetData, "WRAPPER");

  libWrapper.register(MODULE_ID, "TokenConfig.defaultOptions", switchAmbientTokenLightTemplate, "WRAPPER");
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.getData", tokenSourceGetData, "WRAPPER");
}

Object.defineProperty(LightSource.prototype, "boundaryPolygon", {
  value: boundaryPolygon,
  writable: true,
  configurable: true
});

Object.defineProperty(SoundSource.prototype, "boundaryPolygon", {
  value: boundaryPolygon,
  writable: true,
  configurable: true
});


Object.defineProperty(AmbientLight.prototype, "customEdges", {
  value: customEdges,
  writable: true,
  configurable: true
});

Object.defineProperty(SoundSource.prototype, "customEdges", {
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

function switchAmbientTokenLightTemplate(wrapper) {
  const cfg = wrapper();
  log("switchAmbientTokenLightTemplate", cfg);
  cfg.template = `modules/${MODULE_ID}/templates/token-config.html`;
  return cfg;
}

function ambientSourceGetData(wrapper, options) {
  const data = wrapper(options);

  // When first loaded, a light may not have flags.lightmask.
  // But afterward, set the boolean so that the UI shows sides or points if necessary.
  let isStar = false;
  let isPolygon = false;
  if (data.data?.flags?.lightmask?.shape) {
    isStar = data.data.flags.lightmask.shape === "star";
    isPolygon = data.data.flags.lightmask.shape === "polygon";
  }

  return foundry.utils.mergeObject(data, {
    shapes: {
      circle: "lightmask.Circle",
      polygon: "lightmask.RegularPolygon",
      star: "lightmask.RegularStar",
      none: "lightmask.None"
    },
    "data.flags.lightmask.isStar": isStar,
    "data.flags.lightmask.isPolygon": isPolygon
  });
}


async function tokenSourceGetData(wrapper, options) {
  const data = await wrapper(options);

  // When first loaded, a light may not have flags.lightmask.
  // But afterward, set the boolean so that the UI shows sides or points if necessary.
  let isStar = false;
  let isPolygon = false;
  if ( data.object?.flags?.lightmask?.shape ) {
    isStar = data.object.flags.lightmask.shape === "star";
    isPolygon = data.object.flags.lightmask.shape === "polygon";
  }

  return foundry.utils.mergeObject(data, {
    shapes: {
      circle: "lightmask.Circle",
      polygon: "lightmask.RegularPolygon",
      star: "lightmask.RegularStar",
      none: "lightmask.None"
    },
    "object.flags.lightmask.isStar": isStar,
    "object.flags.lightmask.isPolygon": isPolygon
  });
}
