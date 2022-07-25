/* globals
getDocumentClass,
canvas
*/
"use strict";

import { findIntersectionsBruteSingle } from "./IntersectionsBrute.js";
// import { identifyIntersectionsWithNoEndpoint } from "./ClockwiseSweep/utilities.js";
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
 * Adds custom edges.
 */
export function identifyEdgesClockwiseSweepPolygon(wrapped) {
  wrapped();

  const src = this.config.source;
  const origin = this.origin;

  // See class LightSource and initialize method
  const doc = src.object.document;
  const type = src.object.sourceType; // Or this.los.type? or passed parameter?

  const edges_cache = doc.getFlag(MODULE_ID, KEYS.CUSTOM_WALLS.EDGES); // This = source.object?
  if (!edges_cache || edges_cache.length === 0) return;

  const is_relative = doc.getFlag(MODULE_ID, KEYS.RELATIVE);
  const stored_origin = is_relative
    ? (doc.getFlag(MODULE_ID, KEYS.ORIGIN) || origin)
    : origin;

  log(`_addCustomEdges origin ${stored_origin.x}, ${stored_origin.y} --> ${origin.x}, ${origin.y}`);
  const delta = { dx: origin.x - stored_origin.x,
                  dy: origin.y - stored_origin.y }; // eslint-disable-line indent

  log(`_addCustomEdges ${edges_cache.length} custom edges to add.`);

  // See WallsLayer.prototype.#defineBoundaries
  const cls = getDocumentClass("Wall");
  const ctx = { parent: canvas.scene };
  const walls = edges_cache.map(e => {
    const c = [
      e.c[0] + delta.dx,
      e.c[1] + delta.dy,
      e.c[2] + delta.dx,
      e.c[3] + delta.dy
    ];
    return new cls({ _id: `LightMaskTemp_${e.id}`, c, type: e[type] }, ctx);
  });

  log(`identifyEdgesClockwiseSweepPolygon ${walls.length} walls`, walls);


//
//   const edges = [];
//   edges_cache.forEach(data => {
//     log(`_addCustomEdges Adding custom edge ${data.id}`);
//     const edge = new SimplePolygonEdge({ x: data.c[0] + delta.dx,
//                                          y: data.c[1] + delta.dy }, // eslint-disable-line indent
//                                        { x: data.c[2] + delta.dx,   // eslint-disable-line indent
//                                          y: data.c[3] + delta.dy }, // eslint-disable-line indent
//                                        data[type]);                 // eslint-disable-line indent
//     edges.push(edge);
//   });



  // Edges must be checked for intersections between each other.
  // Set of arbitrary user-created walls could have intersections.
  // Could do this when first added to cache, but would need to split walls there or
  // figure out how to shift edges and edge intersections relative to the origin here.
//   IntersectionsBrute(edges, identifyIntersectionsWithNoEndpoint);

  // Edges must also be checked for intersections against the walls

//   return edges;
}


