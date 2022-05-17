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
import { log } from "./module.js";

let TOKEN_VISION_LIBWRAPPER_ID;

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

export function registerTokenVisionOverride() {
  if(getSetting("use-token-vision-radius")) {
    TOKEN_VISION_LIBWRAPPER_ID = libWrapper.register(MODULE_ID, "VisionSource.prototype.initialize", lightMaskVisionSourceInit, "OVERRIDE");
  } else {
    libWrapper.unregister(MODULE_ID, TOKEN_VISION_LIBWRAPPER_ID ?? "VisionSource.prototype.initialize");
  }
}

function lightMaskVisionSourceInit(data={}) {

  // Initialize new input data
  const changes = this._initializeData(data);

  // Compute derived data attributes
  this.radius = Math.max(Math.abs(this.data.dim), Math.abs(this.data.bright));
  this.ratio = Math.clamped(Math.abs(this.data.bright) / this.radius, 0, 1);
  this.limited = this.data.angle !== 360;

  // Compute the source polygon
  const origin = {x: this.data.x, y: this.data.y};
  this.los = CONFIG.Canvas.losBackend.create(origin, {
    type: "sight",
    angle: this.data.angle,
    rotation: this.data.rotation,
    source: this,
    radius: canvas.lighting.globalLight ? undefined : this.radius // *** NEW ***
  });

  // Store the FOV circle
  this.fov = new PIXI.Circle(origin.x, origin.y, this.radius);

  // Record status flags
  this._flags.useFov = canvas.performance.textures.enabled;
  this._flags.renderFOV = true;
  if ( this.constructor._appearanceKeys.some(k => k in changes) ) {
    for ( let k of Object.keys(this._resetUniforms) ) {
      this._resetUniforms[k] = true;
    }
  }

  // Set the correct blend mode
  this._initializeBlending();
  return this;
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
  if(data.object?.flags?.lightmask?.shape) {
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
