/* globals
PolygonVertex,
PIXI
*/
"use strict";

/**
 * @typedef {WeilerAthertonClipperConfig} WeilerAthertonClipperConfig
 * @property {number}   [density]    The desired density of the approximated circle, a number per PI
 * @property {boolean}  [union]         Whether this is a union or an intersect
 */


/* Methods required for the clipObject

// Get the center point of the clipObject. Technically, any point within the clipObject will do.
// @type {Point}
get center()

// Does the clipObject contain the point?
// Required for testForEnvelopment, _buildPointTrackingArray
// @param {number} x
// @param {number} y
// @returns {boolean} True if point {x,y} is contained within the clipObject.
contains(x, y)

// Convert the clipObject to a polygon.
// Required for testForEnvelopment
// @param {Object} opts   Optional parameters passed to toPolygon. E.g., {density} for circle.
// @returns {PIXI.Polygon}
toPolygon(opts)

// Get all intersection points for a segment A|B
// Intersections must be sorted from A to B.
// @param {Point} a
// @param {Point} b
// @returns {Point[]}
segmentIntersections(a, b)

// Get all the points (for a polygon approximation of) the clipObject between
// two points on (or nearly on) the clipObject.
// Points must be sorted clockwise around the clipObject.
// @param {Point} a
// @param {Point} b
// @param {object} opts Optional parameters passed to toPolygon. E.g., {density} for circle.
// @returns {Point[]}
pointsBetween(a, b, opts)
*/

/**
 * An implementation of the Weiler Atherton algorithm for clipping polygons.
 * It currently only handles combinations that will not result in any holes.
 * Handling holes is not terribly difficult, but is non-trivial code to maintain.
 * It is faster than the Clipper library for this task because it relies on the unique properties of the
 * circle. It is also more precise in that it uses the actual intersection points between
 * the circle and polygon, instead of relying on the polygon approximation of the circle
 * to find the intersection points.
 *
 * Primary methods:
 * - intersect and union: Combine a clip object with a polygon
 *
 * For more explanation of the underlying algorithm, see:
 * https://en.wikipedia.org/wiki/Weiler%E2%80%93Atherton_clipping_algorithm
 * https://www.geeksforgeeks.org/weiler-atherton-polygon-clipping-algorithm
 * https://h-educate.in/weiler-atherton-polygon-clipping-algorithm/
 */
export class WeilerAthertonClipper extends PIXI.Polygon {
  constructor(points = [], { union = true, clippingOpts = {} } = {}) {
    super(points);

    this.close();
    if ( !this.isClockwise ) this.reverseOrientation();

    /**
     * Configuration settings
     * @type {object} [config]
     * @param {boolean} [config.union]  True for union, false for intersect
     * @param {object} [config.clippingOpts]  Object passed to the clippingObject methods
     *                                        toPolygon and pointsBetween
     */
    this.config = { union, clippingOpts };
  }

  static INTERSECTION_TYPES = { OUT_IN: -1, IN_OUT: 1, TANGENT: 0 };

  /**
   * Convert a polygon into a WeilerAthertonClipper object.
   * @param {PIXI.Polygon} polygon
   * @returns {WeilerAthertonClipper}
   */
  static fromPolygon(polygon, { union = true, clippingOpts = {} } = {}) {
    return new this(polygon.points, { union, clippingOpts });
  }

  /**
   * Union a polygon and clipObject using the Weiler Atherton algorithm.
   * @param {PIXI.Polygon} polygon
   * @param {Object} clipObject
   * @returns {PIXI.Polygon[]}
   */
  static union(polygon, clipObject, { clippingOpts = {}} = {}) {
    const wa = this.fromPolygon(polygon, { clippingOpts, union: true });
    return wa.combine(clipObject);
  }

  /**
   * Intersect a polygon and clipObject using the Weiler Atherton algorithm.
   * @param {PIXI.Polygon} polygon
   * @param {Object} clipObject
   * @returns {PIXI.Polygon[]}
   */
  static intersect(polygon, clipObject, { clippingOpts = {}} = {}) {
    const wa = this.fromPolygon(polygon, { clippingOpts, union: false });
    return wa.combine(clipObject);
  }

  /**
   * Clip a given clipObject using the Weiler Atherton algorithm.
   * @param {Object} clipObject
   * @returns {PIXI.Polygon[]}
   */
  combine(clipObject, { union = this.config.union } = {}) {
    console.log(`WA Combining polygon (${this.points.length} points) with clipObject`, clipObject);
    const trackingArray = this._buildPointTrackingArray(clipObject);
    return this._combineNoHoles(trackingArray, clipObject, { union });
  }

  /**
   * Clip the polygon with the clipObject, assuming no holes will be created.
   * For a union or intersect with no holes, a single pass through the intersections will
   * build the resulting union shape.
   * @param {PolygonVertex[]} trackingArray
   * @param {Object} clipObject
   * @returns {[PIXI.Polygon]}
   */
  _combineNoHoles(trackingArray, clipObject, { union = this.config.union } = {}) {
    const ln = trackingArray.length;
    if ( !ln ) return this.testForEnvelopment(clipObject, { union });

    let prevIx = trackingArray[ln - 1];
    let wasTracingPolygon = (prevIx.type === this.constructor.INTERSECTION_TYPES.OUT_IN) ^ union;
    const points = [];
    for ( let i = 0; i < ln; i += 1 ) {
      const ix = trackingArray[i];
      this._processIntersection(ix, prevIx, wasTracingPolygon, points, clipObject);
      wasTracingPolygon = !wasTracingPolygon;
      prevIx = ix;
    }
    return [new PIXI.Polygon(points)];
  }

  /**
   * Given an intersection and the previous intersection, fill the points
   * between the two intersections, in clockwise order.
   * @param {PolygonVertex} prevIx
   * @param {PolygonVertex} ix
   * @param {Object} clipObject
   * @param {boolean} wasTracingPolygon  Whether we were tracing the polygon (true) or the clipObject (false).
   */
  _processIntersection(ix, prevIx, wasTracingPolygon, points, clipObject) {
    const { opts } = this.config;

    if ( wasTracingPolygon ) points.push(...ix.leadingPoints);
    else points.push(...clipObject.pointsBetween(prevIx, ix, {opts}));

    points.push(ix);
  }

  /**
   * Test if one shape envelops the other. Assumes the shapes do not intersect.
   *  1. Polygon is contained within the clip object. Union: clip object; Intersect: polygon
   *  2. Clip object is contained with polygon. Union: polygon; Intersect: clip object
   *  3. Polygon and clip object are outside one another. Union: both; Intersect: null
   * @param {PIXI.Polygon} polygon    Polygon to test
   * @param {Object} clipObject       Other object to test. Must have:
   *                                  - Getter "center"
   *                                  - "toPolygon" method
   *                                  - "contains" method
   *
   * @param {Object}  [options]       Options that affect the result
   * @param {boolean} [options.union] Is this a union (true) or intersect (false)
   * @returns {[PIXI.Polygon|clipObject]}  Returns the polygon, the clipObject, both, or neither.
   */
  testForEnvelopment(clipObject, { union = this.config.union } = {}) {
    const points = this.points;
    if ( points.length < 6 ) return [];

    // Option 1: Polygon contained within circle
    const polygonInClipObject = clipObject.contains(points[0], points[1]);
    if ( polygonInClipObject ) return union ? [clipObject] : [this];

    // Option 2: Circle contained within polygon
    const center = clipObject.center;
    const clipObjectInPolygon = polygonInClipObject ? false : this.contains(center.x, center.y);
    if ( clipObjectInPolygon ) return union ? [this] : [clipObject];

    // Option 3: Neither contains the other
    return union ? [this, clipObject] : [];
  }

  /**
   * Construct an array of intersections between the polygon and the clipping object.
   * The intersections follow clockwise around the polygon.
   * Round all intersections and polygon vertices to the nearest pixel (integer).
   * Assumes that clipObject is a convex shape such that drawing a line through it
   * will intersect at most twice.
   *
   * @param {PIXI.Polygon} polygon
   * @param {PIXI.Polygon} polygon    Polygon to test
   * @param {Object} clipObject       Other object to test. Must have:
   *                                  - "segmentIntersections" method
   * @returns {PolygonVertex[]}
   */
  _buildPointTrackingArray(clipObject) {
    const points = this.points;
    const ln = points.length;
    if ( ln < 6 ) return []; // Minimum 3 Points required

    const trackingArray = [];

    // Cycle over each edge of the polygon in turn
    // For _findIntersection, also track the edges before and after the edge of interest
    // To make this easier, start at the end of the polygon so it cycles through.
    // If the polygon has only 4 points (6 coords), double-back to beginning
    let a = new PolygonVertex(points[0], points[1]);

    // At each intersection, add the intersection points to the trackingArray.
    // Add the points leading up to this intersection to the first intersection
    let leadingPoints = [a];

    // Example:
    // Points: a -- b -- c -- a
    // Edges: a|b, b|c, c|a
    // If ix0 is on a|b and ix1 is on c|a, leading points for ix1 are b and c.
    // The trick is not doubling up the a point

    // You would think if you find an intersection at an endpoint, it would also show up
    // next round, but you would be (sometimes) wrong. For example,
    // an intersection for a -- b near b on a -- b -- c could be rounded to "b" but then
    // b -- c may have no intersection.

    // Label intersections as in/out, out/in or tangent.
    // Tangent means the edge ends at the intersection and the next edge is on the same side.

    // Check if the last edge is a possible tangent
    const lastPt = new PolygonVertex(points[ln - 4], points[ln - 3]);
    let previousInside = this._determineStartingLocation(lastPt, a, clipObject);

    for ( let i = 2; i < ln; i += 2 ) {
      const b = new PolygonVertex(points[i], points[i + 1]);
      const ixs = this._findIntersections(a, b, clipObject);
      const ixsLn = ixs.length;
      if ( ixsLn ) {
        // If this intersection is a tangent, skip to next
        // if ( this._checkForTangent(ixs, a, b, clipObject,
//           previousInside, leadingPoints, trackingArray)) continue;

        previousInside = this._setIntersectionType(ixs, previousInside);
        ixs[0].leadingPoints = leadingPoints;
        trackingArray.push(...ixs);
        leadingPoints = [];
      }

      // Always add b unless we already did because it is an intersection.
      if ( !ixsLn || (trackingArray.length
        && !b.equals(trackingArray[trackingArray.length - 1])) ) leadingPoints.push(b);

      // Cycle to next edge
      a = b;
    }

    if ( !trackingArray.length ) return trackingArray;

    // Add the points at the end of the points array leading up to the initial intersection
    // Pop the last leading point to avoid repetition (closed polygon)
    leadingPoints.pop();
    trackingArray[0].leadingPoints.unshift(...leadingPoints);

//     this.constructor._labelIntersections(trackingArray, clipObject);

    return trackingArray;
  }

  /**
   * Find intersections of this polygon with the clipObject.
   */
  _findIntersections(a, b, clipObject) {
    return clipObject.segmentIntersections(a, b).map(ix => {
      const v = PolygonVertex.fromPoint(ix);
      v.leadingPoints = []; // Ensure leadingPoints is defined.
      v.attachEdge({A: a, B: b});  // For debugging
      return v;
    });
  }

  /**
   * Determine whether the edge a --> b is outside or inside
   */
  _determineStartingLocation(a, b, clipObject) {
    const ixs = clipObject.segmentIntersections(a, b).map(ix => PolygonVertex.fromPoint(ix));
    const ln = ixs.length;
    if ( !ln || !ixs[ln - 1].equals(b) ) return clipObject.contains(b.x, b.y);
    else if ( !ixs[0].equals(a) ) return clipObject.contains(a.x, a.y);

    // Otherwise, a and b are both intersections; keep true
    return true;
  }

  /**
   * Check for tangent intersection
   */
  _checkForTangent(ixs, a, b, clipObject, previousInside, leadingPoints, trackingArray) {
    const lastIx = trackingArray[trackingArray.length - 1];

    if ( ixs[0].equals(a)) {
      if ( ixs.length === 1 && this._insideEqualsPrevious(a, b, clipObject, previousInside) ) {
        // Tangent
        if ( lastIx && lastIx.equals(a) ) {
          // TO-DO: Can this happen? Means lastIx had equaled (b)
          // We can skip this previous intersection so long as we keep the leadingPoints
          // to add to the next valid intersection.
          leadingPoints = lastIx.leadingPoints;
          leadingPoints.push(a, b);
          trackingArray.pop();
        } else leadingPoints.push(b);
        return true;
      }
      // If the intersection is the starting endpoint, prefer the intersection.
      leadingPoints.pop();
    }
    return false;
  }

  /**
   * Has a tangent
   */
  _insideEqualsPrevious(a, b, clipObject, previousInside) {
    const bInside = clipObject.contains(b.x, b.y);
    return previousInside === bInside;
  }

  /**
   * Set the type for each intersection
   */
  _setIntersectionType(ixs, previousInside) {
    const types = this.constructor.INTERSECTION_TYPES;
    const type = previousInside ? types.IN_OUT : types.OUT_IN;
    let sign = 1;
    ixs.forEach(ix => {
      ix.type = type * sign;
      sign *= -1;
      previousInside = !previousInside;
    });

    return previousInside;
  }

  /**
   * Label an array of intersections for an edge as in/out or out/in or tangent.
   * Intersections are labeled in place.
   * If not for tangent intersections, we could get away with only labeling the first.
   * But in order to properly skip tangents, we need to know at least that much, as well
   * as knowing in/out for the first proper intersection.
   * @param {Point} ix
   * @param {Point} prevPt
   * @param {Point} nextPt
   */
  static _labelIntersections(trackingArray, clipObject) {
    // Each ix in the tracking array has 0+ lead points.
    // E.g., points 0, 1, ix0, ix1, 3, 4, ix2
    // [0, 1] are lead points to ix0
    // [] lead points to ix1
    // [3, 4] are lead points to ix2
    // We need the point on either side of an intersection
    // So walk all the intersections, marking previous and next points as we go.
    const ln = trackingArray.length;
    if ( !ln ) return;

    const types = this.INTERSECTION_TYPES;

    // Find the first intersection with leading points
    const startIdx = trackingArray.findIndex(ix => ix.leadingPoints.length);
    if ( !~startIdx ) return; // No leading points; all tangents.

    const startIx = trackingArray[startIdx];
    const currentIxs = [startIx];
    let prevPt = startIx.leadingPoints[startIx.leadingPoints.length - 1];
    let nextPt;

    // Skip this first intersection and look for the next one with leading points
    for ( let i = 1; i < ln; i += 1 ) {
      const j = (startIdx + i) % ln;
      const nextIx = trackingArray[j];

      if ( nextIx.leadingPoints.length ) nextPt = nextIx.leadingPoints[0];

      // If we have found previous and next, label intersections, then reset.
      if ( nextPt ) {
        const aInside = clipObject.contains(prevPt.x, prevPt.y);
        const bInside = clipObject.contains(nextPt.x, nextPt.y);

        // If ix has points that share a side, tangent
        // Otherwise, use aInside to define
        let type = types.TANGENT;
        if ( aInside ^ bInside ) type = aInside ? types.IN_OUT : types.OUT_IN;

        // Any interior intersections (between two intersections) are tangents
        // Just need to set the type for the first and last (if any).
        currentIxs[0].type = type;
        if ( currentIxs.length > 1 ) currentIxs[currentIxs.length - 1] = type * -1;

        // For debugging
        for ( const ix of currentIxs) {
          ix.prevPt = { x: prevPt.x, y: prevPt.y };
          ix.nextPt = { x: nextPt.x, y: nextPt.y };
        }

        // Reset
        prevPt = nextIx.leadingPoints[nextIx.leadingPoints.length - 1];
        nextPt = undefined;
        currentIxs.length = 0;
        currentIxs.push(nextIx);
      } else {
        // No leading points, so remember this intersection to process later
        currentIxs.push(nextIx);
      }
    }
  }
}
