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
  destroyAmbientSourceHook } from "./updateSource.js";
import { updateCachedEdges, shiftCustomEdgeCache } from "./customEdges.js";

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
  destroyAmbientLight: destroyAmbientSourceHook
};

/**
 * Wrap _refreshPosition to update cached walls if the light moves.
 * Only when the light is relative to cached walls.
 */
function _refreshPosition(wrapped) {
  log(`_refreshPosition|@${this.position.x},${this.position.y} -> ${this.document.x},${this.document.y}`);

  const isRelative = this.document.getFlag(MODULE_ID, FLAGS.RELATIVE);
  let updates;
  if ( isRelative ) {
    const edgesCache = this.document.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.EDGES);
    const delta = new PIXI.Point(
      this.document.x - this.position.x,
      this.document.y - this.position.y
    );
    if ( edgesCache && edgesCache.length && (delta.x || delta.y) ) {
      log(`\tShifting ${this.id} ${this.isPreview ? "preview" : ""} delta ${delta.x},${delta.y}`);
      const shiftedCache = shiftCustomEdgeCache(edgesCache, delta);
      this.document.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = shiftedCache;
      updateCachedEdges(this, shiftedCache);
    }
  }
  wrapped();
}

PATCHES.BASIC.WRAPS = { _refreshPosition }
