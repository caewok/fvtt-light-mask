/* globals
libWrapper,
LightSource,
SoundSource,
AmbientSoundConfig,
foundry,
canvas,
GlobalLightSource
*/
"use strict";

import {
  lightMaskActivateListeners,
  onAddWallIDs,
  identifyEdgesClockwiseSweepPolygon,
  computeClockwiseSweep } from "./customEdges.js";
import { updateShapeIndicator, updateRotation } from "./render.js";
import { MODULE_ID, KEYS } from "./const.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { log } from "./module.js";

export function registerLightMask() {

  // ------ Switching Shapes and selecting shape parameters ----- //
  libWrapper.register(MODULE_ID, "FormApplication.prototype._onChangeInput", onChangeInputFormApplication, libWrapper.WRAPPER);

  // ------ AmbientLightConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.getData", getDataAmbientConfig, libWrapper.WRAPPER);

  // ------ AmbientSoundConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.getData", getDataAmbientConfig, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.defaultOptions", defaultOptionsAmbientSoundConfig, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.close", closeAmbientSoundConfig, libWrapper.WRAPPER);

  Object.defineProperty(AmbientSoundConfig.prototype, "_refresh", {
    value: refreshAmbientSoundConfig,
    writable: true,
    configurable: true
  });

  // ------ TokenConfig ----- //
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.getData", getDataTokenConfig, libWrapper.WRAPPER);

  // ------ DefaultTokenConfig ----- //
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);

  // ----- Light Source ----- //
  Object.defineProperty(LightSource.prototype, "boundaryPolygon", {
    value: boundaryPolygon,
    writable: true,
    configurable: true
  });

  // ----- Sound Source ----- //
  Object.defineProperty(SoundSource.prototype, "boundaryPolygon", {
    value: boundaryPolygon,
    writable: true,
    configurable: true
  });

  // ----- Sweep ----- //
  libWrapper.register(MODULE_ID, "LightSource.prototype._getPolygonConfiguration", _getPolygonConfigurationLightSource, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "SoundSource.prototype._getPolygonConfiguration", _getPolygonConfigurationSoundSource, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "ClockwiseSweepPolygon.prototype._identifyEdges", identifyEdgesClockwiseSweepPolygon, libWrapper.MIXED, { perf_mode: libWrapper.PERF_FAST});
  libWrapper.register(MODULE_ID, "ClockwiseSweepPolygon.prototype._compute", computeClockwiseSweep, libWrapper.WRAPPER, { perf_mode: libWrapper.PERF_FAST});
}


// ----- Form Application ----- //

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
  if ( event.type !== "change"
    || (event.currentTarget.className !== "lightmask"
    && event.target.name !== "flags.lightmask.rotation") ) return wrapper(event);

  let refresh = false;
  let render = false;

  if ( event.target.name === "flags.lightmask.rotation" ) {
    await updateRotation.call(this, event);
    refresh = true;
  } else if ( event.target.name === "flags.lightmask.customWallIDs" ) {
    onAddWallIDs.call(this, event);
    refresh = true;

  } else {
    // Covers: lightmaskshapes, lightmasksides, lightmaskpoints, lightmaskEllipseMinor
    // If changing shapes, we need to update the sub-parameter selections.
    refresh = true;
    render = event.target.id === "lightmaskshapes";
    await updateShapeIndicator.call(this, event);
  }

  // Refresh the sound shape
  // AmbientLight gets refreshed automatically
  // Tokens get refreshed automatically
  // Default Token Config and Prototype Token are not on the map, so cannot be refreshed.
  refresh &&= this instanceof AmbientSoundConfig;
  refresh && this._refresh(); // eslint-disable-line no-unused-expressions

  const out = await wrapper(event);

  // Update the rendered config html options for the new shape
  render && this.render(); // eslint-disable-line no-unused-expressions
  return out;
}


// ----- Light Source ----- //

/**
 * Wrapper for LightSource.prototype._getPolygonConfiguration
 * Pass in the relevant boundary shape in lieu of the default
 */
function _getPolygonConfigurationLightSource(wrapper) {
  const cfg = wrapper();
  if ( this instanceof GlobalLightSource ) return cfg;

  const doc = this.object.document;
  const shape = doc.getFlag(MODULE_ID, KEYS.SHAPE) || "circle";
  if ( shape === "circle" ) return cfg;
  if ( shape === "none" ) cfg.radius = canvas.scene.dimensions.maxR;
  else cfg.radius = undefined; // Don't let CWSweep add a circle boundary.

  const boundaryShape = this.boundaryPolygon();
  if ( boundaryShape ) cfg.boundaryShapes = [boundaryShape];

  return cfg;
}


// ----- Sound Source ----- //

/**
 * Wrapper for SoundSource.prototype._getPolygonConfiguration
 * Pass in the relevant boundary shape in lieu of the default
 */
function _getPolygonConfigurationSoundSource(wrapper) {
  const cfg = wrapper();

  const shape = this.object.document.getFlag(MODULE_ID, KEYS.SHAPE) || "circle";
  if ( shape === "circle" ) return cfg;
  if ( shape === "none" ) cfg.radius = canvas.scene.dimensions.maxR;
  else cfg.radius = undefined; // Don't let CWSweep add a circle boundary.

  const boundaryShape = this.boundaryPolygon();
  if ( boundaryShape ) cfg.boundaryShapes = [boundaryShape];

  return cfg;
}

// ----- Ambient Light Config ----- //

/**
 * Set the starting shape flag if none set for a given source.
 * Light and Sound sources are not async.
 * @param {Function} wrapper
 * @param {Object} options      See underlying method
 * @return {Object}
 */
function getDataAmbientConfig(wrapper, options) {
  log("getDataAmbientConfig", this);
  const data = wrapper(options);

  // When first loaded, a light may not have flags.lightmask.
  if ( data.data?.flags?.lightmask?.shape ) return data;
  return foundry.utils.mergeObject(data, { "data.flags.lightmask.shape": "circle" });
}


// ----- Ambient Sound Config ----- //

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
 * New method.
 * Add refresh functionality for sound configuration.
 * Based on refresh for AmbientLightConfig
 */
function refreshAmbientSoundConfig() {
  log("refreshSound", this);

  let s = this.document.object;
  if ( !s ) return;

  if ( !s.id ) {
    // Cannot easily refresh a newly created Sound without ghosting
    // Try updating the preview object instead
    if ( canvas.sounds.preview.children.length !== 1 ) return;
    s = canvas.sounds.preview.children[0];
  }

  s.updateSource();
  s.refresh();
}

/**
 * Wrap AmbientSoundConfig.prototype.close
 * Need to remove null placeables so they don't screw up later sound refresh.
 * (Cannot figure out how these are getting added. Something in updateSource or refresh.)
 * @param {Object} options
 */
async function closeAmbientSoundConfig(wrapper, options) {
  if ( !this.object.id ) {
    canvas.sounds.objects.children.forEach(c => {
      if ( !c.id ) canvas.sounds.objects.removeChild(c);
    });
  }
  return wrapper(options);
}


// ----- Token Config ----- //

/**
 * Wrap TokenConfig.prototype.getData.
 * Use the local data, not the database, for the token information so that
 * flags on the token update properly. E.g., shape indicator.
 */
async function getDataTokenConfig(wrapper, options) {
  const out = await wrapper(options);

  if ( !out.object ) return;

  const existing = this.object.toObject(false);
  const flags = existing.flags?.[MODULE_ID];
  if ( typeof flags !== "undefined" ) out.object.flags[MODULE_ID] = flags;

  return out;
}
