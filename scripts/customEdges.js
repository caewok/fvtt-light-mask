/* globals

*/
"use strict";

import { findIntersectionsSortSingle } from "./ClockwiseSweep/IntersectionsSort.js";
import { identifyIntersectionsWithNoEndpoint } from "./ClockwiseSweep/utilities.js";
import { SimplePolygonEdge } from "./ClockwiseSweep/SimplePolygonEdge.js";
import { log } from "./module.js";
import { KEYS, MODULE_ID } from "./const.js";

/*
Likely easiest if ClockwiseSweep checks the source object for a method to get a
boundaryPolygon and customEdgeData. Otherwise, need access to the config object passed
to ClockwiseSweep, which is basically impossible.

This also makes it easier to deal with the callback, because the source object can
define the parameters internally. For example, the source object can store the number
of points or sides for a RegularStar or RegularPolygon to use as boundaryPolygon.

Here, it can store custom edges and whether the edges are relative or absolute.

Thus, it is assumed that this _customEdgeData function will access this, the source object.
*/

/**
 * Callback function that adds custom edges.
 * Added to the source as a method and then trigged by ClockwiseSweep.
 * Returns data used to construct edges: start point, end point, type
 */
export function customEdges(current_origin) {
  // See class LightSource and initialize method
  const doc = this.object.document;
  const type = this.object.sourceType; // Or this.los.type? or passed parameter?

  const edges_cache = doc.getFlag(MODULE_ID, KEYS.CUSTOM_WALLS.EDGES); // This = source.object?
  if (!edges_cache || edges_cache.length === 0) return;

  const is_relative = doc.getFlag(MODULE_ID, KEYS.RELATIVE);
  const stored_origin = is_relative
    ? (doc.getFlag(MODULE_ID, KEYS.ORIGIN) || current_origin)
    : current_origin;

  log(`_addCustomEdges origin ${stored_origin.x}, ${stored_origin.y} --> ${current_origin.x}, ${current_origin.y}`);
  const delta = { dx: current_origin.x - stored_origin.x,
                  dy: current_origin.y - stored_origin.y }; // eslint-disable-line indent

  log(`_addCustomEdges ${edges_cache.length} custom edges to add.`);

  const edges = [];
  edges_cache.forEach(data => {
    log(`_addCustomEdges Adding custom edge ${data.id}`);
    const edge = new SimplePolygonEdge({ x: data.c[0] + delta.dx,
                                         y: data.c[1] + delta.dy }, // eslint-disable-line indent
                                       { x: data.c[2] + delta.dx,   // eslint-disable-line indent
                                         y: data.c[3] + delta.dy }, // eslint-disable-line indent
                                       data[type]);                 // eslint-disable-line indent
    edges.push(edge);
  });

  // Edges must be checked for intersections between each other.
  // Set of arbitrary user-created walls could have intersections.
  // Could do this when first added to cache, but would need to split walls there or
  // figure out how to shift edges and edge intersections relative to the origin here.
  findIntersectionsSortSingle(edges, identifyIntersectionsWithNoEndpoint);

  return edges;
}


