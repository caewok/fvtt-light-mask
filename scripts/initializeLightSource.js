/* globals
CONFIG,
foundry
*/

`use strict`;

// Version of LightSource Class to pass the light id to the fov creation
// Needed so that ClockwisePolygonSweep can find the flags on the light data
// passing only id is probably the lightest way to accomplish this.
// Unfortunately, I don't see a way to accomplish this without an OVERRIDE

import { MODULE_ID, SHAPE_KEY, CUSTOM_WALLS_KEY } from "./const.js";
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
  if(this.object.data.flags[MODULE_ID]?.[SHAPE_KEY] === undefined || 
     this.object.data.flags[MODULE_ID]?.[CUSTOM_WALLS_KEY] === undefined) { return wrapped(data); }
  log(`Initializing light source ${this.object.id}: SHAPE_KEY and CUSTOM_WALLS_KEY present in flags.`);
  
  if(this.object.data.flags[MODULE_ID][SHAPE_KEY] === "circle" &&
     is.null(this.object.data.flags[MODULE_ID][CUSTOM_WALLS_KEY])) { return wrapped(data); }
  log(`Initializing light source ${this.object.id}: not a default circle.`);

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