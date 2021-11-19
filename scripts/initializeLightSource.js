/* globals
CONFIG,
foundry
*/

`use strict`;

// Version of LightSource Class to pass the light id to the fov creation
// Needed so that ClockwisePolygonSweep can find the flags on the light data
// passing only id is probably the lightest way to accomplish this.
// Unfortunately, I don't see a way to accomplish this without an OVERRIDE or MIXED

/*
 When modifying a light in the UI, the flow is:
1. Open the light configuration panel
  1.1 renderAmbientLightConfig hook

2. configuration change is made
  2.1. LightSource.prototype.initialize() (real-time changes, at least for current user)
    2.1.1 create losBackend
    2.1.2 initializeLightSourceShaders hooks
    2.1.3 lightingRefresh hook
    2.1.4 sightRefresh hook

3. Save by hitting UpdateLight
  3.1 preUpdateAmbientLight hook
  3.2 LightSource.prototype.initialize() (same as 2.1)
  3.3 updateAmbientLight hook 
  3.4 LightSource.prototype.initialize() (same as 2.1)
  3.5 closeAmbientLightConfig hook
  3.6 closeDocumentSheet hook
  3.7 closeFormApplication hook
  3.8 closeApplication hook

Need to be able to tell when a user has updated the custom wall keys, locate the walls on the map, and store the relevant info for each wall (A, B, and type).

Flags hate Maps, so store as object.

In LightSource.prototype.initialize:
1. check if the id list has changed by comparing to stored flag.
2. update stored flag accordingly, but only for the local object. 
3. hopefully Foundry will take care of the rest when closing the file.
   the local object data can be used when creating the los polygon

*/

import { MODULE_ID, SHAPE_KEY, CUSTOM_IDS_KEY } from "./const.js";
import { log } from "./module.js";

/**
 * Patch for LightSource.prototype.initialize
 *
 * Initialize the source with provided object data.
 * @param {object} wrapped          Original function passed by libWrapper
 * @param {object} data             Initial data provided to the point source
 * @return {LightSource}            A reference to the initialized source
 */
export function lightMaskInitializeLightSource(wrapped, data={}) {
  log(`Initializing light source ${this.object.id}`, this, data);
  
  // if no flags present, just call the original to improve compatibility
  if(!this.object.data.flags?.[MODULE_ID]) { return wrapped(data); }
  
  log(`Initializing light source ${this.object.id}: ${MODULE_ID} present in flags.`);
  const shape = this.object.document.getFlag(MODULE_ID, SHAPE_KEY);
  const custom_ids = this.object.document.getFlag(MODULE_ID, CUSTOM_IDS_KEY);
  
  if(shape === undefined || custom_ids === undefined) { return wrapped(data); }
  log(`Initializing light source ${this.object.id}: SHAPE_KEY and CUSTOM_IDS_KEY present in flags.`);
  
  // Initialize new input data
  const changes = this._initializeData(data);

  // Record the requested animation configuration
  const seed = this.animation.seed ?? data.seed ?? Math.floor(Math.random() * 100000);
  this.animation = foundry.utils.deepClone(CONFIG.Canvas.lightAnimations[this.data.animation.type]) || {};
  this.animation.seed = seed;

  // Compute data attributes
  this.colorRGB = foundry.utils.hexToRGB(this.data.color);
  this.radius = Math.max(Math.abs(this.data.dim), Math.abs(this.data.bright));
  this.ratio = Math.clamped(Math.abs(this.data.bright) / this.radius, 0, 1);
  this.isDarkness = this.data.luminosity < 0;

  // Compute the source polygon
  const origin = {x: this.data.x, y: this.data.y};
  
  // always call the losBackend so we can handle shapes even if no walls present.
//  if ( !this.data.walls ) this.los = new PIXI.Circle(origin.x, origin.y, this.radius);

  log(`Creating light source losBackend ${this.object.id}`);
  this.los = CONFIG.Canvas.losBackend.create(origin, {
    type: "light",
    angle: this.data.angle,
    density: 60,
    radius: this.radius,
    rotation: this.data.rotation,
    object_id: this.object.id  // changed
  });

  // Flag to know if we use fov render texture
  this._flags.useFov = this.data.walls && !this.preview;

  // Update shaders if the animation type or the constrained wall option changed
  const updateShaders = ("animation.type" in changes || "walls" in changes);
  if ( updateShaders ) this._initializeShaders();

  // Record status flags
  this._flags.hasColor = !!(this.data.color && this.data.alpha);
  this._flags.renderFOV = true;
  if ( updateShaders || this.constructor._appearanceKeys.some(k => k in changes) ) {
    for ( let k of Object.keys(this._resetUniforms) ) {
      this._resetUniforms[k] = true;
    }
  }

  // Initialize blend modes and sorting
  this._initializeBlending();
  return this;
  
}

