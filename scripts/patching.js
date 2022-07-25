/* globals
libWrapper,
LightSource,
SoundSource,
AmbientSoundConfig,
DefaultTokenConfig,
TokenConfig,
foundry,
CONFIG,
PIXI,
canvas
*/
"use strict";

import { lightMaskActivateListeners, updateShapeIndicator, updateRotation } from "./render.js";
import { MODULE_ID, KEYS } from "./const.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { identifyEdgesClockwiseSweepPolygon } from "./customEdges.js";
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

  Object.defineProperty(TokenConfig.prototype, "_refresh", {
    value: refreshTokenConfig,
    writable: true,
    configurable: true
  });

  // ------ DefaultTokenConfig ----- //
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners, libWrapper.WRAPPER);
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.getData", getDataDefaultTokenConfig, libWrapper.WRAPPER);


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
  libWrapper.register(MODULE_ID, "LightSource.prototype._createLOS", createLOSLightSource, libWrapper.MIXED);
  libWrapper.register(MODULE_ID, "SoundSource.prototype.initialize", initializeSoundSource, libWrapper.MIXED);
  libWrapper.register(MODULE_ID, "ClockwiseSweepPolygon.prototype._identifyEdges", identifyEdgesClockwiseSweepPolygon, libWrapper.MIXED, { perf_mode: libWrapper.PERF_FAST});
}

/**
 * Wrapper for LightSource.prototype._createLOS
 * Pass in the relevant boundary shape in lieu of the default
 */
function createLOSLightSource(wrapper) {
  if ( this instanceof GlobalLightSource ) return wrapper();

  const doc = this.object.document;
  const shape = doc.getFlag(MODULE_ID, KEYS.SHAPE) || "circle";
  if ( shape === "circle" ) return wrapper();

  const radius = (shape === "none") ? canvas.scene.dimensions.maxR : this.radius;
  const origin = {x: this.data.x, y: this.data.y};
  const cfg = {
    type: this.data.walls ? "light" : "universal",
    angle: this.data.angle,
    density: PIXI.Circle.approximateVertexDensity(this.radius),
    rotation: this.data.rotation,
    radius,
    source: this
  };

  const boundaryShape = this.boundaryPolygon();
  if ( boundaryShape ) cfg.boundaryShapes = [boundaryShape];

  const los = CONFIG.Canvas.losBackend.create(origin, cfg);

  // Update the flag for whether soft edges are required
  this._flags.renderSoftEdges &&= ((los.edges.size > 0) || (this.data.angle < 360));
  return los;
}

/**
 * Wrapper for SoundSource.prototype.initialize
 * Pass in the relevant boundary shape in lieu of the default
 */
function initializeSoundSource(wrapper, data={}) {
  const doc = this.object.document;
  const shape = doc.getFlag(MODULE_ID, KEYS.SHAPE) || "circle";
  if ( shape === "circle" ) return wrapper();

  this._initializeData(data);

  const radius = (shape === "none") ? canvas.scene.dimensions.maxR : this.radius;
  const origin = {x: this.data.x, y: this.data.y};
  const cfg = {
    type: this.data.walls ? "sound" : "universal",
    density: PIXI.Circle.approximateVertexDensity(this.data.radius),
    radius,
    source: this,
  };

  const boundaryShape = this.boundaryPolygon();
  if ( boundaryShape ) cfg.boundaryShapes = [boundaryShape];

  this.los = CONFIG.Canvas.losBackend.create(origin, cfg);
  return this;
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
  if ( event.type !== "change" || event.currentTarget.className !== "lightmask") return wrapper(event);

  let refresh = false;
  let render = false;

  if ( event.target.name === "flags.lightmask.rotation" ) {
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
  return await wrapper(event);
}


/**
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

/**
 * Set the starting shape flag and other settings for a given token source.
 * Token sources use an async getData method.
 * @param {Function} wrapper
 * @param {Object} options      See underlying method
 * @return {Object}
 */
async function getDataTokenConfig(wrapper, options) {
  log("getDataTokenConfig", options, this);
  const data = await wrapper(options);

  // Location of the flag depends on type of source

  const shape = this instanceof DefaultTokenConfig
    ? data.flags?.lightmask?.shape
    : data.object?.flags?.lightmask?.shape;
  if ( shape ) return data;

  if ( this instanceof DefaultTokenConfig ) {
    return foundry.utils.mergeObject(data, { "data.flags.lightmask.shape": "circle" });
  } else {
    return foundry.utils.mergeObject(data, { "data.object.flags.lightmask.shape": "circle" });
  }
}
