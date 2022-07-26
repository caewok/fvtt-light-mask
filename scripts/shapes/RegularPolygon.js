/* globals
PIXI,
foundry,
ClipperLib
*/
"use strict";

/* Define a set of Regular Polygon shapes
Each should extend PIXI.Polygon like LimitedAnglePolygon does.
Each is non-changeable; modifications result in new object.
Each are referenced in local space for the contains test:
- local origin 0, 0
- rotation considered after: all oriented up

Each can be intersected quickly using WA
*/

import { WeilerAthertonClipper } from "../WeilerAtherton.js";
import { pointFromAngle, rotatePoint, translatePoint } from "./util.js";

export class RegularPolygon extends PIXI.Polygon {

  /**
   * @param {Point} origin   Center point of the polygon.
   * @param {number} radius  Circumscribed circle radius.
   * @param {object} options Options that affect the polygon shape
   * @param {number} options.numSides  Number of sides for this polygon
   * @param {number} options.rotation  Rotation, in degrees, from a starting point due east
   */
  constructor(origin, radius, { numSides = 3, rotation = 0 } = {}) {
    super([]);
    this.x = origin.x;
    this.y = origin.y;
    this.numSides = numSides;
    this.radius = radius;
    this.rotation = Math.normalizeDegrees(rotation);
    this.radians = Math.toRadians(this.rotation);

    // Placeholders for getters
    this._fixedPoints = undefined; // So that subclasses can override generateFixedPoints
    this._points = undefined;

    // Polygon properties
    this._isClosed = true;
    this._isClockwise = true;
  }

  get center() { return { x: this.x, y: this.y }; }

  get points() { return this._points || (this._points = this._generatePoints()); }

  set points(value) { }

  get fixedPoints() { return this._fixedPoints || (this._fixedPoints = this._generateFixedPoints()); }

  /**
   * Calculate the distance of the line segment from the center to the midpoint of a side.
   * @type {number}
   */
  get apothem() {
    return this.radius * Math.cos(Math.PI / this.numSides);
  }

  /**
   * Calculate length of a side of this regular polygon.
   * @type {number}
   */
  get sideLength() {
    return 2 * this.radius * Math.sin(Math.PI / this.numSides);
  }

  /**
   * Calculate area of the regular polygon.
   * @type {number}
   */
  get area() {
    return this.numSides * this.sideLength * this.apothem;
  }

  /**
   * Circumscribed (outer) circle passing through the points
   * @type {PIXI.Circle}
   */
  get outerCircle() { return new PIXI.Circle(0, 0, this.radius); }

  /**
   * Largest circle that will fit inside the polygon
   * @type {PIXI.Circle}
   */
  get innerCircle() { return new PIXI.Circle(0, 0, this.apothem); }

  /**
   * Interior angle of two sides, in degrees
   * @type {number}
   */
  get interiorAngle() { return (180 + (180 * (this.numSides - 3))) / this.numSides; }

  /**
   * Generate the points of the shape in shape-space (before rotation or translation)
   * @return {Points[]}
   */
  _generateFixedPoints() {
    const { numSides, radius } = this;

    const angles = Array.fromRange(numSides).map(i => (360 / numSides) * i);
    const radAngles = angles.map(a => Math.toRadians(a));
    return radAngles.map(angle => pointFromAngle({x: 0, y: 0}, angle, radius));
  }

  /**
   * Generate the points that represent this shape as a polygon in Cartesian space.
   * @return {Points[]}
   */
  _generatePoints() {
    // Faster to use for loop rather than flatten
    const pts = [];
    const fp = this.fixedPoints;
    const ln = fp.length;
    for ( let i = 0; i < ln; i += 1 ) {
      const pt = this.toCartesianCoords(fp[i]);
      pts.push(pt.x, pt.y);
    }
    return pts;
  }

  /**
   * Generate the bounding box (in Cartesian coordinates)
   * @returns {PIXI.Rectangle}
   */
  getBounds() {
    // Default to the bounding box of the radius circle
    const { x, y, radius: r } = this;
    const r2 = r * 2;
    return new PIXI.Rectangle(x - r, y - r, r2, r2);
  }

  /**
   * Shift from cartesian coordinates to the shape space.
   * @param {Point} a
   * @returns {Point}
   */
  fromCartesianCoords(a) { return rotatePoint(translatePoint(a, -this.x, -this.y), -this.radians); }

  /**
   * Shift to cartesian coordinates from the shape space.
   * @param {Point} a
   * @returns {Point}
   */
  toCartesianCoords(a) { return translatePoint(rotatePoint(a, this.radians), this.x, this.y); }

  /**
   * Does the shape contain the point?
   * @param {number} x
   * @param {number} y
   * @returns {boolean} True if point {x,y} is contained within the shape.
   */
  contains(x, y) {
    const pt = this.fromCartesianCoords({ x, y });

    // Test the outer and inner circles
    if ( !this.outerCircle.contains(pt.x, pt.y) ) return false;
    if ( this.innerCircle.contains(pt.x, pt.y) ) return true;

    // Use orientation to test the point.
    // Moving clockwise, must be clockwise to each side.
    const { fixedPoints: fp, numSides } = this;
    for ( let i = 0; i < numSides; i += 1 ) {
      const fp0 = fp[i];
      const fp1 = fp[(i + 1) % numSides];
      if ( foundry.utils.orient2dFast(fp0, fp1, pt) >= 0 ) return false;
    }

    return true;
  }

  /**
   * Convert the shape to a normal polygon, for testing.
   * @returns {PIXI.Polygon}
   */
  toPolygon() { return new PIXI.Polygon(this.points); }

  /**
   * Get all intersection points for a segment A|B
   * Intersections must be sorted from A to B.
   * @param {Point} a
   * @param {Point} b
   * @returns {Point[]}
   */
  segmentIntersections(a, b) {
    a = this.fromCartesianCoords(a);
    b = this.fromCartesianCoords(b);

    const ixs = [];
    const fp = this.fixedPoints;
    const ln = fp.length;
    for ( let i = 0; i < ln; i += 1 ) {
      const x = foundry.utils.lineSegmentIntersection(fp[i], fp[(i + 1) % ln], a, b);
      if ( x ) ixs.push(x);
    }

    return ixs.map(ix => this.toCartesianCoords(ix));
  }

  /**
   * Get all the points (corners) of the shape between
   * two points on (or nearly on) the shape.
   * Points must be sorted clockwise around the shape.
   * @param {Point} a
   * @param {Point} b
   * @returns {Point[]}
   */
  pointsBetween(a, b) {
    if ( a.x.almostEqual(b.x) && a.y.almostEqual(b.y) ) return [];

    a = this.fromCartesianCoords(a);
    b = this.fromCartesianCoords(b);

    const aSide = this._getSide(a);
    if ( !~aSide ) return []; // A is inside

    const bSide = this._getSide(b);
    if ( !~bSide ) return []; // B is inside

    const pts = [];
    const { numSides, fixedPoints: fp } = this;

    if ( aSide === bSide ) {
      // Either a is before b moving clockwise (no points)
      // or a is after b moving clockwise (all points)
      if ( foundry.utils.orient2dFast({x: 0, y: 0}, a, b) < 0 ) return [];
      pts.push(...[0, 1, 2].map(i => fp[(i + aSide + 1) % numSides]));
    } else {
      let currSide = aSide;
      while ( currSide !== bSide ) {
        currSide = (currSide + 1) % numSides;
        pts.push(fp[currSide]);
      }
    }

    // If the last point is collinear to the center, drop
    if ( !foundry.utils.orient2dFast({x: 0, y: 0}, pts[pts.length - 1], b )) pts.pop();

    return pts.map(pt => this.toCartesianCoords(pt));
  }

  /**
   * Determine on which side a point lies.
   * @param {Point} point  Point, in shape-space
   * @returns {number} 0, 1, or 2 for the side.
   *                   If point is on a corner, returns the next side
   *                   Returns -1 if inside.
   */
  _getSide(point) {
    const numSides = this.numSides;
    for ( let i = 0; i < numSides; i += 1 ) {
      const side = this._checkSide(point, i);
      if ( ~side ) return side;
    }
    return -1;
  }

  /**
   * Determine if a point is on this side
   * @param {Point} point  Point, in shape-space
   * @returns {number} Returns the side number.
   *                   If point is on a corner, returns the next side.
   *                   Returns -1 if not on this side
   */
  _checkSide(point, side) {
    const numSides = this.numSides;
    const fp0 = this.fixedPoints[side];
    const fp1 = this.fixedPoints[(side + 1) % numSides];

    if ( fp1.x.almostEqual(point.x) && fp1.y.almostEqual(point.y) ) return (side + 1) % numSides;

    const orient01 = foundry.utils.orient2dFast(fp0, fp1, point);

    // If clockwise, the point is inside relative to this side
    if ( orient01 < 0 ) return -1;

    // If counterclockwise, the point is on this side, but might be equivalent to fp1
    const orientC = foundry.utils.orient2dFast({x: 0, y: 0}, fp1, point);
    if ( !orientC ) return (side + 1) % numSides;
    return side;
  }

  /**
   * Intersect this shape with a PIXI.Polygon.
   * Use WeilerAtherton to perform precise intersect.
   * @param {PIXI.Polygon} polygon      A PIXI.Polygon
   * @param {object} [options]          Options which configure how the intersection is computed
   * @param {number} [options.clipType]       The clipper clip type (union or intersect will use WA)
   * @param {number} [options.scalingFactor]  A scaling factor passed to Polygon#toClipperPoints to preserve precision
   * @returns {PIXI.Polygon|null}       The intersected polygon or null if no solution was present
   */
  intersectPolygon(polygon, {clipType, scalingFactor}={}) {
    if ( !this.radius ) return new PIXI.Polygon([]);
    clipType ??= ClipperLib.ClipType.ctIntersection;

    if ( clipType !== ClipperLib.ClipType.ctIntersection
      && clipType !== ClipperLib.ClipType.ctUnion) {
      // polygon.intersectPolygon(this.toPolygon(), {clipType, scalingFactor});
      return super.intersectPolygon(polygon, {clipType, scalingFactor});
    }

    polygon._preWApoints = [...polygon.points];

    const union = clipType === ClipperLib.ClipType.ctUnion;
    const wa = WeilerAthertonClipper.fromPolygon(polygon, { union });
    const res = wa.combine(this)[0];

    if ( !res ) {
      console.warn("RegularPolygon.prototype.intersectPolygon returned undefined.");
      return new PIXI.Polygon([]);
    }

    return res instanceof PIXI.Polygon ? res : res.toPolygon();
  }

}
