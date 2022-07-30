/* globals
getDocumentClass,
canvas,
PolygonEdge,
PolygonVertex,
Wall
*/
"use strict";

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

  let edges_cache = doc.getFlag(MODULE_ID, KEYS.CUSTOM_WALLS.EDGES);
  if (!edges_cache || edges_cache.length === 0) return;

  edges_cache = duplicate(edges_cache);  // Avoid modifying the cache below

  const is_relative = doc.getFlag(MODULE_ID, KEYS.RELATIVE);
  const stored_origin = is_relative
    ? (doc.getFlag(MODULE_ID, KEYS.ORIGIN) || origin)
    : origin;

  log(`_addCustomEdges origin ${stored_origin.x}, ${stored_origin.y} --> ${origin.x}, ${origin.y}`);
  const delta = { dx: origin.x - stored_origin.x,
                  dy: origin.y - stored_origin.y }; // eslint-disable-line indent

  log(`_addCustomEdges ${edges_cache.length} custom edges to add.`);

  const tmpEdges = edges_cache.map(obj => {
    obj.c[0] += delta.dx;
    obj.c[1] += delta.dy;
    obj.c[2] += delta.dx;
    obj.c[3] += delta.dy;

    const w = TempWall.fromCacheData(obj);
    const e = PolygonEdge.fromWall(w, this.config.type);
    e._isTemporary = true;
    return e;
  });
  //     .filter(w => {
  //       return !this.edges.some(e => e.A.equals(w.A) && e.B.equals(w.B)
  //         || e.A.equals(w.B) && e.B.equals(w.A))
  //     });

  log(`identifyEdgesClockwiseSweepPolygon ${tmpEdges.length} edges`, tmpEdges);

  const ln = tmpEdges.length;
  if ( !ln ) return;

  // Edges must be checked for intersections between each other.
  // Set of arbitrary user-created walls could have intersections.
  // Could do this when first added to cache, but would need to split walls there or
  // figure out how to shift edges and edge intersections relative to the origin here.
  for ( let i = 0; i < ln; i += 1 ) {
    for ( let j = i + 1; j < ln; j += 1 ) {
      tmpEdges[i].wall._identifyIntersectionsWith(tmpEdges[j].wall);
    }
  }

  // Edges must also be checked for intersections against the existing set
  // Note: Temp edges must be removed later
  for ( const e1 of this.edges ) {
    for ( const e2 of tmpEdges ) {
      // Must use TempEdge to call _identifyIntersectionsWith
      e2.wall._identifyIntersectionsWith(e1.wall);
    }
  }

  for ( const e of tmpEdges ) this.edges.add(e);
}

// Remove temporary intersections from walls
export function computeClockwiseSweep(wrapper) {
  wrapper();
  this.edges.forEach(e => {
    if ( !e._isTemporary ) return;
    e.wall._removeIntersections();
  });
}

export class TempWall {
  /**
   * Cache data: c, id
   */
  constructor(_id, c, light, move, sight, sound) {
    // See WallsLayer.prototype.#defineBoundaries
    const cls = getDocumentClass("Wall");
    const ctx = { parent: canvas.scene };
    this.document = new cls({_id, c, light, move, sight, sound }, ctx);
    this.intersectsWith = new Map();
    this.#initializeVertices();
  }

  #wallKeys;

  #vertices;

  get vertices() {
    return this.#vertices;
  }

  get wallKeys() {
    return this.#wallKeys;
  }

  /**
   * Create PolygonVertex instances for the Wall endpoints and register the set of vertex keys.
   */
  #initializeVertices() {
    this.#vertices = {
      a: new PolygonVertex(...this.document.c.slice(0, 2)),
      b: new PolygonVertex(...this.document.c.slice(2, 4))
    };
    this.#wallKeys = new Set([this.#vertices.a.key, this.#vertices.b.key]);
  }

  static fromCacheData(obj) {
    const { id, c, light, move, sight, sound } = obj;
    const _id = `LMtmp${id.substring(0, 11)}`;
    return new this(_id, c, light, move, sight, sound);
  }

  /**
   * Copy of Wall.prototype._identifyIntersectionsWith but without the calls to private objects.
   */
  _identifyIntersectionsWith(other) {
    if ( this === other ) return;
    const {a: wa, b: wb} = this.vertices;
    const {a: oa, b: ob} = other.vertices;

    // Ignore walls which share an endpoint
    if ( this.wallKeys.intersects(other.wallKeys) ) return;

    // Record any intersections
    if ( !foundry.utils.lineSegmentIntersects(wa, wb, oa, ob) ) return;
    const x = foundry.utils.lineLineIntersection(wa, wb, oa, ob);
    if ( !x ) return;  // This eliminates co-linear lines, should not be necessary
    this.intersectsWith.set(other, x);
    other.intersectsWith.set(this, x);
  }

  _removeIntersections = Wall.prototype._removeIntersections;
}
