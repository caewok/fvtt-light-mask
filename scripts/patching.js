/* globals
libWrapper,
LightSource,
SoundSource,
AmbientSoundConfig,
DefaultTokenConfig,
TokenConfig,
foundry
*/
"use strict";

import { lightMaskActivateListeners, updateShapeIndicator, updateRotation } from "./renderAmbientLightConfig.js";
import { MODULE_ID } from "./const.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { customEdges } from "./customEdges.js";
import { log } from "./module.js";

export function registerLightMask() {

  // ------ Switching Shapes and selecting shape parameters ----- //
  libWrapper.register(MODULE_ID, "FormApplication.prototype._onChangeInput", onChangeInputFormApplication, "WRAPPER");

  // ------ AmbientLightConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.getData", getDataAmbientSource, "WRAPPER");

  // ------ AmbientSoundConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.getData", getDataAmbientSource, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.defaultOptions", defaultOptionsAmbientSoundConfig, "WRAPPER");

  Object.defineProperty(AmbientSoundConfig.prototype, "_refresh", {
    value: refreshAmbientSoundConfig,
    writable: true,
    configurable: true
  });

  // ------ TokenConfig ----- //
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.getData", tokenSourceGetData, "WRAPPER");

  Object.defineProperty(TokenConfig.prototype, "_refresh", {
    value: refreshTokenConfig,
    writable: true,
    configurable: true
  });

  // ------ DefaultTokenConfig ----- //
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.getData", getDataDefaultTokenConfig, "WRAPPER");


  // ----- Light Source ----- //
  Object.defineProperty(LightSource.prototype, "boundaryPolygon", {
    value: boundaryPolygon,
    writable: true,
    configurable: true
  });

  Object.defineProperty(LightSource.prototype, "customEdges", {
    value: customEdges,
    writable: true,
    configurable: true
  });

  // ----- Sound Source ----- //
  Object.defineProperty(SoundSource.prototype, "boundaryPolygon", {
    value: boundaryPolygon,
    writable: true,
    configurable: true
  });

  Object.defineProperty(SoundSource.prototype, "customEdges", {
    value: customEdges,
    writable: true,
    configurable: true
  });
}

/**
 * Wrapper for DefaultTokenConfig.prototype.getData
 * Force to pull data from local, not source.
 * This fixes an issue where Application.prototype._render was not getting the updated
 * shape selection when using getData, which it needs to pass to the render hook.
 * @param {Function} wrapper
 * @param {Object} options      See DefaultTokenConfig.prototype.getData
 * @return {Object|Promise}
 */
async function getDataDefaultTokenConfig(wrapper, options) {
  log("getDataDefaultTokenConfig");
  const out = await wrapper(options);
  out.object = this.data.toObject(false);
  return out;
}

/**
 * Wrapper for FormApplication.prototype._onChangeInput
 * Refresh if rotating shape or changing shape parameters.
 * Render the configuration application window if updating shape, so the
 * correct shape parameters are displayed.
 * @param {Function} wrapper
 * @param {Object} event      The initial change event
 * @return {undefined|Promise}
 */
async function onChangeInputFormApplication(wrapper, event) {
  log("formApplicationChangeInput", event, this);

  if ( event.type !== "change" ) return wrapper(event);

  let refresh = false;
  let render = false;

  if ( event.target.name === "flags.lightmask.rotation" ) {
    log("LightMask rotation");
    await updateRotation.call(this, event);
    refresh = true;
  } else {
    // Covers: lightmaskshapes, lightmasksides, lightmaskpoints, lightmaskEllipseMinor
    // If changing shapes, we need to update the sub-parameter selections.
    refresh = true;
    render = event.target.id === "lightmaskshapes";
    await updateShapeIndicator.call(this, event);
  }

  // Refresh the sound or token light shape
  // AmbientLight gets refreshed automatically
  // Default Token Config and Prototype Token are not on the map, so cannot be refreshed.
  refresh &&= !this.token || !(this.isPrototype);
  refresh &&= !(this instanceof DefaultTokenConfig);
  refresh &&= (this instanceof AmbientSoundConfig || this instanceof TokenConfig);
  refresh && this._refresh(); // eslint-disable-line no-unused-expressions

  // Update the rendered config html options for the new shape
  render && this._render(); // eslint-disable-line no-unused-expressions

  log(`formApplicationChangeInput render ${render}; refresh ${refresh}`);
  return await wrapper(event);
}


/**
 * Add refresh functionality for sound configuration.
 * Based on refresh for AmbientLightConfig
 */
function refreshAmbientSoundConfig() {
  log("refreshSound", this);
  if ( !this.document.object ) return;
  this.document.object.updateSource();
  this.document.object.refresh();
}

/**
 * Add refresh functionality for token configuration.
 * Based on refresh for AmbientLightConfig
 */
function refreshTokenConfig() {
  log("refreshToken", this);
  if ( !this.token.object ) return;
  this.token.object.updateSource();
  this.token.object.refresh();
}

/**
 * Wrapper for AmbientSoundConfig.defaultOptions
 * Make the sound config window resize height automatically, to accommodate
 * different shape parameters.
 * @param {Function} wrapper
 * @return {Object} See AmbientSoundConfig.defaultOptions.
 */
function defaultOptionsAmbientSoundConfig(wrapper) {
  const options = wrapper();
  return foundry.utils.mergeObject(options, {
    height: "auto"
  });
}

/**
 * Set the starting shape flag if none set for a given source
 * @param {Function} wrapper
 * @param {Object} options      See underlying method
 * @return {Object}
 */
function getDataAmbientSource(wrapper, options) {
  log("ambientSourceGetData", this);
  const data = wrapper(options);

  // When first loaded, a light may not have flags.lightmask.
  if ( data.data?.flags?.lightmask?.shape ) return data;
  return foundry.utils.mergeObject(data, { "data.flags.lightmask.shape": "circle" });
}

/**
 * Set the starting shape flag and other settings for a given token source
 * @param {Function} wrapper
 * @param {Object} options      See underlying method
 * @return {Object}
 */
async function tokenSourceGetData(wrapper, options) {
  log("tokenSourceGetData", options, this);
  const data = await wrapper(options);

  // When first loaded, a light may not have flags.lightmask.
  // But afterward, set the boolean so that the UI shows sides or points if necessary.
  let isStar = false;
  let isPolygon = false;
  let isEllipse = false;

  // Location of the flag depends on type of source
  const loc = this instanceof DefaultTokenConfig ? data.flags?.lightmask?.shape : data.object?.flags?.lightmask?.shape;
  if ( loc ) {
    isStar = loc === "star";
    isPolygon = loc === "polygon";
    isEllipse = loc === "ellipse";
  }

  return foundry.utils.mergeObject(data, {
    shapes: {
      circle: "lightmask.Circle",
      ellipse: "lightmask.Ellipse",
      polygon: "lightmask.RegularPolygon",
      star: "lightmask.RegularStar",
      none: "lightmask.None"
    },
    "object.flags.lightmask.isStar": isStar,
    "object.flags.lightmask.isPolygon": isPolygon,
    "object.flags.lightmask.isEllipse": isEllipse
  });
}
