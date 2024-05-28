/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";

// Patches for the ClockwiseSweepPolygon class
export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Wraps ----- //

/**
 * Modify edge types to include cached edges for the light source.
 * @param {Edge} edge                     The Edge being considered
 * @param {Record<EdgeTypes, 0|1|2>} edgeTypes Which types of edges are being used? 0=no, 1=maybe, 2=always
 * @param {PIXI.Rectangle} bounds         The overall bounding box
 * @returns {boolean}                     Should the edge be included?
 */
function _testEdgeInclusion(wrapped, edge, edgeTypes, bounds) {
  const obj = this.config.source?.object;
  if ( obj ) edgeTypes[`${MODULE_ID}.cachedWall.${obj.id}${obj.isPreview ? ".preview" : ""}`] = 1;
  return wrapped(edge, edgeTypes, bounds);
}

PATCHES.BASIC.WRAPS = { _testEdgeInclusion };
