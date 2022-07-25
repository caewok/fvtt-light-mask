/* globals
PolygonVertex,
PIXI,
foundry
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
    return new this(polygon.points, { union, clippingOpts })
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
    const trackingArray = this._buildPointTrackingArray(clipObject);

    if ( !trackingArray.length ) return this.testForEnvelopment(clipObject, { union });

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
    const { opts } = this.config;

    let prevIx = trackingArray[0];
    let tracePolygon = (prevIx.type === this.constructor.INTERSECTION_TYPES.OUT_IN) ^ union;
    const points = [prevIx];
    const ln = trackingArray.length;
    for ( let i = 1; i < ln; i += 1 ) {
      const ix = trackingArray[i];
      this._processIntersection(ix, prevIx, tracePolygon, points, clipObject);
      tracePolygon = !tracePolygon;
      prevIx = ix;
    }

    // Finish by filling in points leading up to the first intersection.
    this._processIntersection(trackingArray[0], prevIx, tracePolygon, points, clipObject);
    return [new PIXI.Polygon(points)];
  }

  /**
   * Given an intersection and the previous intersection, fill the points
   * between the two intersections, in clockwise order.
   * @param {PolygonVertex} prevIx
   * @param {PolygonVertex} ix
   * @param {Object} clipObject
   * @param {boolean} tracePolygon  Whether we are tracing the polygon (true) or the clipObject (false).
   */
  _processIntersection(ix, prevIx, tracePolygon, points, clipObject) {
    const { opts } = this.config;

    if ( tracePolygon ) points.push(...ix.leadingPoints);
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
    let prevPt = new PolygonVertex(points[(ln - 4) % ln], points[(ln - 3) % ln]); // Ignore closing point
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

    for ( let i = 2; i < ln; i += 2 ) {
      const b = new PolygonVertex(points[i], points[i + 1]);
      const ixs = clipObject.segmentIntersections(a, b).map(ix => {
        const v = PolygonVertex.fromPoint(ix)
        v.leadingPoints = []; // Ensure leadingPoints is defined.
        return v;
      });

      const ixsLn = ixs.length;
      if ( ixsLn ) {
        // If the intersection is the starting endpoint, prefer the intersection.
        if ( ixs[0].equals(a) ) leadingPoints.pop();
        ixs[0].leadingPoints = leadingPoints;
        trackingArray.push(...ixs);
        leadingPoints = [];
      }

      // Always add b unless we already did because it is an intersection.
      if ( !ixsLn || (trackingArray.length && !b.equals(trackingArray[trackingArray.length - 1])) ) leadingPoints.push(b);

      // Cycle to next edge
      prevPt = a;
      a = b;
    }

    // Add the points at the end of the points array leading up to the initial intersection
    // Pop the last leading point to avoid repetition (closed polygon)
    const tLn = trackingArray.length;
    if ( !tLn ) return trackingArray;

    leadingPoints.pop();
    trackingArray[0].leadingPoints.unshift(...leadingPoints);

    // Determine the first intersection label
    const ix = trackingArray[0];
    const priorIx = trackingArray[tLn - 1];
    let nextIx = trackingArray[1] || ix;
    const priorPt = ix.leadingPoints[ix.leadingPoints.length - 1] || priorIx;
    const nextPt = nextIx.leadingPoints[0] || nextIx;
    this.constructor._labelIntersections([ix], priorPt, nextPt, clipObject)

    return trackingArray;
  }

  /**
   * Label an array of intersections for an edge as in/out or out/in.
   * Intersections are labeled in place.
   * @param {Point} ix
   * @param {Point} prevPt
   * @param {Point} nextPt
   * @param {boolean} If the intersection is a tangent, return false
   */
  static _labelIntersections(ixs, a, b, clipObject) {
    if ( !ixs.length ) return false;

    const types = this.INTERSECTION_TYPES;
    const aInside = clipObject.contains(a.x, a.y);
    const bInside = clipObject.contains(b.x, b.y);

    //if ( !(aInside ^ bInside) && ixs.length === 1 ) return types.TANGENT;

    const type = aInside ? types.IN_OUT : types.OUT_IN;
    let sign = 1;
    ixs.forEach(ix => {
      ix.attachEdge({A: a, B: b});
      ix.type = type * sign;
      sign *= -1;
    });

    return true;
  }
}


// Needed to change 1 line in the quadraticIntersection, but cannot override, so...
// May as well trim down lineCircleIntersection a bit while we are at it...
/**
 * Determine the intersection between a candidate wall and the circular radius of the polygon.
 * @memberof helpers
 *
 * @param {Point} a                   The initial vertex of the candidate edge
 * @param {Point} b                   The second vertex of the candidate edge
 * @param {Point} center              The center of the bounding circle
 * @param {number} radius             The radius of the bounding circle
 * @param {number} epsilon            A small tolerance for floating point precision
 *
 * @returns {LineCircleIntersection}  The intersection of the segment AB with the circle
 */
function lineCircleIntersection(a, b, center, radius, epsilon=1e-8) {
  const r2 = Math.pow(radius, 2);
  let intersections = [];

  // Test whether endpoint A is contained
  const ar2 = Math.pow(a.x - center.x, 2) + Math.pow(a.y - center.y, 2);
  const aInside = ar2 <= r2 + epsilon;

  // Test whether endpoint B is contained
  const br2 = Math.pow(b.x - center.x, 2) + Math.pow(b.y - center.y, 2);
  const bInside = br2 <= r2 + epsilon;

  // Find quadratic intersection points
  const contained = aInside && bInside;
  if ( !contained ) {
    intersections = quadraticIntersection(a, b, center, radius, epsilon);
  }

  // Return the intersection data
  return {
    aInside,
    bInside,
    contained,
    intersections
  };
}


/**
 * Determine the points of intersection between a line segment (p0,p1) and a circle.
 * There will be zero, one, or two intersections
 * See https://math.stackexchange.com/a/311956
 * @memberof helpers
 *
 * @param {Point} p0            The initial point of the line segment
 * @param {Point} p1            The terminal point of the line segment
 * @param {Point} center        The center of the circle
 * @param {number} radius       The radius of the circle
 * @param {number} [epsilon=0]  A small tolerance for floating point precision
 */
function quadraticIntersection(p0, p1, center, radius, epsilon=0) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  // Quadratic terms where at^2 + bt + c = 0
  const a = Math.pow(dx, 2) + Math.pow(dy, 2);
  const b = (2 * dx * (p0.x - center.x)) + (2 * dy * (p0.y - center.y));
  const c = Math.pow(p0.x - center.x, 2) + Math.pow(p0.y - center.y, 2) - Math.pow(radius, 2);

  // Discriminant
  const disc2 = Math.pow(b, 2) - (4 * a * c);
  if ( disc2 < 0 ) return []; // No intersections

  // Roots
  const disc = Math.sqrt(disc2);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);
  // If t1 hits (between 0 and 1) it indicates an "entry"
  const intersections = [];
  if ( t1.between(0-epsilon, 1+epsilon) ) {
    intersections.push({
      x: p0.x + (dx * t1),
      y: p0.y + (dy * t1)
    });
  }

  // If the discriminant is exactly 0, a segment endpoint touches the circle
  // (and only one intersection point)
  if ( disc2 === 0 ) return intersections;

  // If t2 hits (between 0 and 1) it indicates an "exit"
  if ( t2.between(0-epsilon, 1+epsilon) ) {
    intersections.push({
      x: p0.x + (dx * t2),
      y: p0.y + (dy * t2)
    });
  }
  return intersections;
}
