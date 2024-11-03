/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";
import { log } from "./util.js";

// Patches for the ClockwiseSweepPolygon class
export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Wraps ----- //

/**
 * Modify edge types to include cached edges for the light source.
 * @returns {Record<EdgeTypes, 0|1|2>} edgeTypes Which types of edges are being used? 0=no, 1=maybe, 2=always
 */
const CACHED_ID = `${MODULE_ID}.cachedWall`;
function _determineEdgeTypes(wrapped) {
  const edgeTypes = wrapped();
  const obj = this.config.source?.object;
  if ( obj ) {
    let id = `${CACHED_ID}.${obj.id}`;
    if ( obj.isPreview ) id += ".preview";
    edgeTypes[id] = 1;
  }
  return edgeTypes;
}

PATCHES.BASIC.WRAPS = { _determineEdgeTypes };
