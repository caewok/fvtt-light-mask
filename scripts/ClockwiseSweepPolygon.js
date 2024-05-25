/* globals
foundry,
PolygonEdge
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { FLAGS } from "./const.js";
import { getFlag } from "./util.js";

// Patches for the ClockwiseSweepPolygon class
export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Mixes ----- //

/**
 * Wrap ClockwiseSweep.prototype._identifyEdges
 * Adds custom edges.
 */
function _identifyEdges(wrapper) {
  wrapper();

  const src = this.config.source;
  if ( !(src instanceof foundry.canvas.sources.BaseEffectSource) ) return;

  // See class LightSource and initialize method
  const doc = src.object.document;

  // Issue #14 (drag ruler pathfinding does not use a proper edge)
  if ( !doc ) return;

  let edges_cache = getFlag(doc, FLAGS.CUSTOM_WALLS.EDGES);
  if (!edges_cache || edges_cache.length === 0) return;

  edges_cache = foundry.utils.duplicate(edges_cache);  // Avoid modifying the cache below

  const is_relative = getFlag(doc, FLAGS.RELATIVE);
  const origin = this.origin;
  const stored_origin = is_relative
    ? (getFlag(doc, FLAGS.ORIGIN) || origin)
    : origin;

  const delta = { dx: origin.x - stored_origin.x,
                  dy: origin.y - stored_origin.y };

  const tmpEdges = edges_cache.map(obj => {
    obj.c[0] += delta.dx;
    obj.c[1] += delta.dy;
    obj.c[2] += delta.dx;
    obj.c[3] += delta.dy;
    obj.type = this.config.type;

    const e = new foundry.canvas.edges.Edge(
      { x: obj.c[0], y: obj.c[1] },
      { x: obj.c[2], y: obj.c[3] },
      obj)

    // const w = TempWall.fromCacheData(obj);
//     const e = PolygonEdge.fromWall(w, this.config.type);
    e._isTemporary = true;
    return e;
  }).filter(w => {
    return !(this.edges.some(e => (e.A.equals(w.A) && e.B.equals(w.B))
      || (e.A.equals(w.B) && e.B.equals(w.A))));
  });

  const ln = tmpEdges.length;
  if ( !ln ) return;

  // Tmp edges must be checked for intersections
  // Set of arbitrary user-created walls could have intersections.
  // Could do this when first added to cache, but would need to split walls there or
  // figure out how to shift edges and edge intersections relative to the origin here.
  for ( let i = 0; i < ln; i += 1 ) {
    const tmp = tmpEdges[i];

    // Check tmp edges for intersections against each other.
    for ( let j = i + 1; j < ln; j += 1 ) {
      tmp.wall._identifyIntersectionsWith(tmpEdges[j].wall);
    }

    // Check against the existing canvas walls
    for ( const e of this.edges ) {
      tmp.wall._identifyIntersectionsWith(e.wall);
    }

    // Add to the sweep edge set
    this.edges.add(tmp);

    // For debugging
    this._tmpEdges = tmpEdges;
  }
}

PATCHES.BASIC.MIXES = { _identifyEdges };

// ----- NOTE: Wraps ----- //

/**
 * Wrap ClockwiseSweep.prototype.compute
 * Remove temporary intersections from walls
 */
function compute(wrapper) {
  wrapper();
  const src = this.config.source;
  if ( !(src instanceof foundry.canvas.sources.BaseEffectSource) ) return;

  this.edges.forEach(e => {
    if ( !e._isTemporary ) return;
    e.wall._removeIntersections();
  });
}

PATCHES.BASIC.WRAPS = { compute };
