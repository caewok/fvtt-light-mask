/* globals
PIXI
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { FLAGS, MODULE_ID } from "./const.js";
import { log } from "./util.js";
import {
  preCreateAmbientSourceHook,
  createAmbientSourceHook,
  preUpdateAmbientSourceHook,
  updateAmbientSourceHook,
  deleteAmbientSourceHook,
  drawAmbientSourceHook,
  refreshAmbientSourceHook,
  destroyAmbientSourceHook } from "./updateSource.js";
import { updateCachedEdges, shiftCustomEdgeCache, getCachedEdgeKeys } from "./customEdges.js";

// Patches for the AmbientLight class
export const PATCHES = {};
PATCHES.BASIC = {};

PATCHES.BASIC.HOOKS = {
  preCreateAmbientLight: preCreateAmbientSourceHook,
  createAmbientLight: createAmbientSourceHook,
  preUpdateAmbientLight: preUpdateAmbientSourceHook,
  updateAmbientLight: updateAmbientSourceHook,
  deleteAmbientLight: deleteAmbientSourceHook,
  drawAmbientLight: drawAmbientSourceHook,
  refreshAmbientLight: refreshAmbientSourceHook,
  destroyAmbientLight: destroyAmbientSourceHook
};

/**
 * Wrap _refreshPosition to update cached walls if the light moves.
 * Only when the light is relative to cached walls.
 */
function _refreshPosition(wrapped) {
  log(`_refreshPosition|${this.constructor.name} ${this.id}${this.isPreview ? ".preview" : ""} @${this.position.x},${this.position.y} -> ${this.document.x},${this.document.y}`);

//   const isRelative = this.document.getFlag(MODULE_ID, FLAGS.RELATIVE);
//   let updates;
//   if ( isRelative ) {
//     const edgesCache = this.document.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.EDGES);
//     const delta = new PIXI.Point(
//       this.document.x - this.position.x,
//       this.document.y - this.position.y
//     );
//     if ( edgesCache && edgesCache.length && (delta.x || delta.y) ) {
//       log(`\tShifting ${this.id} ${this.isPreview ? "preview" : ""} delta ${delta.x},${delta.y}`);
//       const shiftedCache = shiftCustomEdgeCache(edgesCache, delta);
//       this.document.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = shiftedCache;
//       updateCachedEdges(this, shiftedCache);
//     }
//   }
  wrapped();
}

/**
 * Update the LightSource associated with this AmbientLight object.
 * @param {object} [options={}]               Options which modify how the source is updated
 * @param {boolean} [options.deleted=false]   Indicate that this light source has been deleted
 */
function initializeLightSource(wrapped, {deleted=false}={}) {
  log(`initializeLightSource|Source ${this.constructor.name} ${this.id}${this.isPreview ? ".preview" : ""} @${this.document.x},${this.document.y}`);

  // If no edges defined for this (likely preview) source, update the edges.
  // Need to do that here b/c no way to hook the preview object creation before it is drawn.
  let edgesCache = this.document.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.EDGES);
  if ( !deleted && edgesCache && edgesCache.length && !getCachedEdgeKeys(this).length ) {
    log(`\tUpdating edges cache.`);
    updateCachedEdges(this, edgesCache);
  }

//   if ( typeof edgesCache === "undefined" ) return wrapped({ deleted });
//   let updateCanvasEdges = false;
//
//   // Record locally any change in position since the last update.
//   const isRelative = this.document.getFlag(MODULE_ID, FLAGS.RELATIVE);
//   const currOrigin = { x: this.document.x, y: this.document.y };
//   const prevOrigin = this.document.getFlag(MODULE_ID, FLAGS.ORIGIN) ?? currOrigin;
//   const positionChanged = !(prevOrigin.x === currOrigin.x || prevOrigin.y === currOrigin.y);
//   log(`\tRelative? ${isRelative} | Position changed? ${positionChanged} | edges? ${edgesCache.length}`);
//   if ( positionChanged ) this.document.flags[MODULE_ID][FLAGS.ORIGIN] = currOrigin;
//
//   // Update the edgesCache if needed.
//   if ( edgesCache.length ) {
//     updateCanvasEdges ||= !getCachedEdgeKeys(this).length;
//     if ( isRelative && positionChanged ) {
//       updateCanvasEdges ||= true;
//       const delta = { x: currOrigin.x - prevOrigin.x, y: currOrigin.y - prevOrigin.y };
//       edgesCache = shiftCustomEdgeCache(edgesCache, delta);
//     }
//   }
//
//   // Update the canvas edges for this light.
//   if ( updateCanvasEdges ) updateCachedEdges(this, edgesCache);
  wrapped({ deleted });
}

PATCHES.BASIC.WRAPS = { _refreshPosition, initializeLightSource }
