/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { CustomEdges } from "./CustomEdges.js";

// Patches for the ClockwiseSweepPolygon class
export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Wraps ----- //

/**
 * Modify edge types to include cached edges for the light source.
 * @returns {Record<EdgeTypes, 0|1|2>} edgeTypes Which types of edges are being used? 0=no, 1=maybe, 2=always
 */
function _determineEdgeTypes(wrapped) {
  const edgeTypes = wrapped();
  const obj = this.config.source?.object;
  const edgeType = { mode: 1, priority: Number.NEGATIVE_INFINITY };
  if ( obj ) edgeTypes[CustomEdges.edgeTypeForPlaceable(obj)] = edgeType;
  return edgeTypes;
}

PATCHES.BASIC.WRAPS = { _determineEdgeTypes };
