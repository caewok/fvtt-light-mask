/* globals
libWrapper,
LightSource,
SoundSource,
AmbientSoundConfig,
canvas,
GlobalLightSource
*/
"use strict";

import {
  identifyEdgesClockwiseSweepPolygon,
  computeClockwiseSweep } from "./customEdges.js";
import {
  defaultOptionsAmbientSoundConfig,
  _renderAmbientSoundConfig,
  closeAmbientSoundConfig,
  _onChangeInputAmbientSoundConfig,
  _previewChangesAmbientSoundConfig,
  _resetPreviewAmbientSoundConfig,
  _updateObjectAmbientSoundConfig } from "./sound_config.js";

import { MODULE_ID, FLAGS } from "./const.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { getFlag } from "./util.js";

/**
 * Helper to wrap methods.
 * @param {string} method       Method to wrap
 * @param {function} fn         Function to use for the wrap
 * @param {object} [options]    Options passed to libWrapper.register. E.g., { perf_mode: libWrapper.PERF_FAST}
 */
function wrap(method, fn, options = {}) { libWrapper.register(MODULE_ID, method, fn, libWrapper.WRAPPER, options); }

/**
 * Helper to wrap methods using mixed.
 * @param {string} method       Method to wrap
 * @param {function} fn         Function to use for the wrap
 * @param {object} [options]    Options passed to libWrapper.register. E.g., { perf_mode: libWrapper.PERF_FAST}
 */
function wrapMixed(method, fn, options = {}) { libWrapper.register(MODULE_ID, method, fn, libWrapper.MIXED, options); }


/**
 * Helper to add a method to a class.
 * @param {class} cl      Either Class.prototype or Class
 * @param {string} name   Name of the method
 * @param {function} fn   Function to use for the method
 */
function addClassMethod(cl, name, fn) {
  Object.defineProperty(cl, name, {
    value: fn,
    writable: true,
    configurable: true
  });
}

export function registerLightMask() {

  // ------ AmbientLightConfig ----- //

  // ------ AmbientSoundConfig ----- //
  // wrap("AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners);
  wrap("AmbientSoundConfig.defaultOptions", defaultOptionsAmbientSoundConfig);
  wrap("AmbientSoundConfig.prototype._render", _renderAmbientSoundConfig);
  wrap("AmbientSoundConfig.prototype.close", closeAmbientSoundConfig);
  wrap("AmbientSoundConfig.prototype._onChangeInput", _onChangeInputAmbientSoundConfig);
  wrap("AmbientSoundConfig.prototype._updateObject", _updateObjectAmbientSoundConfig);

  addClassMethod(AmbientSoundConfig.prototype, "_previewChanges", _previewChangesAmbientSoundConfig);
  addClassMethod(AmbientSoundConfig.prototype, "_resetPreview", _resetPreviewAmbientSoundConfig);

  // ------ TokenConfig ----- //
  // wrap("TokenConfig.prototype.activateListeners", lightMaskActivateListeners);

  // ------ DefaultTokenConfig ----- //
  // wrap("DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners);

  // ----- Light Source ----- //
  addClassMethod(LightSource.prototype, "boundaryPolygon", boundaryPolygon);

  // ----- Sound Source ----- //
  //wrap("AmbientSound.prototype._refresh", _refreshAmbientSound);
  addClassMethod(SoundSource.prototype, "boundaryPolygon", boundaryPolygon);

  // ----- Sweep ----- //
  wrap("LightSource.prototype._getPolygonConfiguration", _getPolygonConfigurationLightSource);
  wrap("SoundSource.prototype._getPolygonConfiguration", _getPolygonConfigurationSoundSource);
  wrapMixed("ClockwiseSweepPolygon.prototype._identifyEdges", identifyEdgesClockwiseSweepPolygon, { perf_mode: libWrapper.PERF_FAST});
  wrap("ClockwiseSweepPolygon.prototype._compute", computeClockwiseSweep, { perf_mode: libWrapper.PERF_FAST})
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
  const shape = getFlag(doc, FLAGS.SHAPE) || "circle";
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

  const shape = getFlag(this.object.document, FLAGS.SHAPE) || "circle";
  if ( shape === "circle" ) return cfg;
  if ( shape === "none" ) cfg.radius = canvas.scene.dimensions.maxR;
  else cfg.radius = undefined; // Don't let CWSweep add a circle boundary.

  const boundaryShape = this.boundaryPolygon();
  if ( boundaryShape ) cfg.boundaryShapes = [boundaryShape];

  return cfg;
}
