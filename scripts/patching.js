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
import { lightMaskActivateListeners } from "./render.js";
import {
  _refreshAmbientSound,
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

export function registerLightMask() {

  // ------ AmbientLightConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);

  // ------ AmbientSoundConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.defaultOptions", defaultOptionsAmbientSoundConfig, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype._render", _renderAmbientSoundConfig, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.close", closeAmbientSoundConfig, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype._onChangeInput", _onChangeInputAmbientSoundConfig, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype._updateObject", _updateObjectAmbientSoundConfig, libWrapper.WRAPPER);

  Object.defineProperty(AmbientSoundConfig.prototype, "_previewChanges", {
    value: _previewChangesAmbientSoundConfig,
    writable: true,
    configurable: true
  });

  Object.defineProperty(AmbientSoundConfig.prototype, "_resetPreview", {
    value: _resetPreviewAmbientSoundConfig,
    writable: true,
    configurable: true
  });

  // ------ TokenConfig ----- //
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);

  // ------ DefaultTokenConfig ----- //
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);

  // ----- Light Source ----- //
  Object.defineProperty(LightSource.prototype, "boundaryPolygon", {
    value: boundaryPolygon,
    writable: true,
    configurable: true
  });

  // ----- Sound Source ----- //
  libWrapper.register(MODULE_ID, "AmbientSound.prototype._refresh", _refreshAmbientSound, libWrapper.WRAPPER);
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
