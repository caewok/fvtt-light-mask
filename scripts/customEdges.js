/* globals
canvas,
getDocumentClass,
foundry,
ui
*/
"use strict";

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
    this.id = _id;
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
      a: new foundry.canvas.edges.PolygonVertex(...this.document.c.slice(0, 2)),
      b: new foundry.canvas.edges.PolygonVertex(...this.document.c.slice(2, 4))
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

  _removeIntersections() {
    for ( const other of this.intersectsWith.keys() ) {
      other.intersectsWith.delete(this);
    }
    this.intersectsWith.clear();
  }
}
