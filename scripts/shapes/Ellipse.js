/* globals
PIXI,
ClipperLib
*/
"use strict";

import { rotatePoint, translatePoint } from "./util.js";
import { WeilerAthertonClipper } from "../WeilerAtherton.js";

/**
 * Ellipse class structured similarly to PIXI.Circle
 * - x, y center
 * - major, minor axes
 * - rotation
 */
export class Ellipse extends PIXI.Ellipse {
  /**
   * Default representation has the major axis horizontal (halfWidth), minor axis vertical (halfHeight)
   *
   * @param {Number}  x       Center of ellipse
   * @param {Number}  y       Center of ellipse
   * @param {Number}  halfWidth   Semi-major axis
   * @param {Number}  halfHeight   Semi-minor axis
   * Optional:
   * @param {Number}  rotation  Amount in degrees the ellipse is rotated
   */
  constructor(x, y, halfWidth, halfHeight, { rotation = 0 } = {}) {
    super(x, y, halfWidth, halfHeight);
    this.rotation = Math.normalizeDegrees(rotation);
    this.radians = Math.toRadians(this.rotation);

    this.major = Math.max(halfWidth, halfHeight);
    this.minor = Math.min(halfWidth, halfHeight);
    this.ratio = halfWidth / halfHeight;
    this.ratioInv = 1 / this.ratio;
  }

  /**
   * Center of the ellipse
   * @type {Point}
   */
  get center() { return { x: this.x, y: this.y }; }

  /**
   * Area of the ellipse
   * @type {number}
   */
  get area() { return Math.PI * this.major * this.minor; }

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

  toCircleCoords(a) { return { x: a.x * this.ratioInv, y: a.y }; }

  fromCircleCoords(a) { return { x: a.x * this.ratio, y: a.y }; }

  _toCircle() { return new PIXI.Circle(0, 0, this.height); }

  /**
   * Bounding box of the ellipse
   * @return {PIXI.Rectangle}
   */
  getBounds() {
    // Bounds rectangle measured from top left corner. x, y, width, height
    switch ( this.rotation ) {
      case 0:
      case 180:
        return new PIXI.Rectangle(this.x - this.major, this.y - this.minor, this.major * 2, this.minor * 2);

      case 90:
      case 270:
        return new PIXI.Rectangle(this.x - this.minor, this.y - this.major, this.minor * 2, this.major * 2);
    }

    // Default to bounding box of the radius circle
    return new PIXI.Rectangle(this.x - this.major, this.y - this.major, this.major * 2, this.major * 2);
  }

  /**
   * Test whether the ellipse contains a given point {x,y}.
   * @param {number} x
   * @param {number} y
   * @return {Boolean}
   */
  contains(x, y) {
    const { width, height } = this;
    if ( width <= 0 || height <= 0 ) return false;

    // Move point to Ellipse-space
    const pt = this.fromCartesianCoords({x, y});

    // reject if x is outside the bounds
    if ( pt.x < -this.major
      || pt.x > this.major
      || pt.y < -this.minor
      || pt.y > this.minor ) return false;

    // Just like PIXI.Ellipse.prototype.contains but we are already at 0, 0
    // Normalize the coords to an ellipse
    let normx = (pt.x / width);
    let normy = (pt.y / height);
    normx *= normx;
    normy *= normy;

    return (normx + normy <= 1);
  }

  /**
   * Convert to a polygon
   * @return {PIXI.Polygon}
   */
  toPolygon({ density } = {}) {
    // Default to the larger radius for density
    density ??= PIXI.Circle.approximateVertexDensity(this.major);

    // Translate to a circle to get the circle polygon
    const cirPoly = this._toCircle().toPolygon({ density });

    // Translate back to ellipse coordinates
    const cirPts = cirPoly.points;
    const pts = [];
    const ln = cirPts.length;
    for ( let i = 0; i < ln; i += 2 ) {
      const cirPt = {x: cirPts[i], y: cirPts[i + 1]};
      const eZPt = this.fromCircleCoords(cirPt);
      const ePt = this.toCartesianCoords(eZPt);
      pts[i] = ePt.x;
      pts[i+1] = ePt.y;
    }

    cirPoly.points = pts;
    return cirPoly;
  }

  /**
   * Get all the intersection points for a segment A|B
   * Intersections must be sorted from A to B
   * @param {Point} a
   * @param {Point} b
   * @returns {Point[]}
   */
  segmentIntersections(a, b) {
    // Translate to a circle
    const cir = this._toCircle();

    // Move to ellipse coordinates and then to circle coordinates
    a = this.toCircleCoords(this.fromCartesianCoords(a));
    b = this.toCircleCoords(this.fromCartesianCoords(b));

    // Get the intersection points and convert back to cartesian coords;
    const ixs = cir.segmentIntersections(a, b);
    return ixs.map(ix => this.toCartesianCoords(this.fromCircleCoords(ix)));
  }

  /**
   * Get all the points for a polygon approximation of a circle between two points on the circle.
   * Points are clockwise from a to b.
   * @param { Point } a
   * @param { Point } b
   * @return { Point[]}
   */
  pointsBetween(a, b, { density } = {}) {
    // Default to the larger radius for density
    density ??= PIXI.Circle.approximateVertexDensity(this.major);

    // Translate to a circle
    const cir = this._toCircle();

    // Move to ellipse coordinates and then to circle coordinates
    a = this.toCircleCoords(this.fromCartesianCoords(a));
    b = this.toCircleCoords(this.fromCartesianCoords(b));

    // Get the points and translate back to cartesian coordinates
    const pts = cir.pointsBetween(a, b, { density });
    return pts.map(pt => this.toCartesianCoords(this.fromCircleCoords(pt)));
  }

  /**
   * Intersect this shape with a PIXI.Polygon.
   * Use WeilerAtherton to perform precise intersect.
   * @param {PIXI.Polygon} polygon      A PIXI.Polygon
   * @param {object} [options]          Options which configure how the intersection is computed
   * @param {number} [options.density]        Number of points in the polygon approximation of the ellipse
   * @param {number} [options.clipType]       The clipper clip type (union or intersect will use WA)
   * @param {number} [options.scalingFactor]  A scaling factor passed to Polygon#toClipperPoints to preserve precision
   * @returns {PIXI.Polygon|null}       The intersected polygon or null if no solution was present
   */
  intersectPolygon(polygon, options) {
    if ( !this.major || !this.minor ) return new PIXI.Polygon([]);

    // Default to the larger radius for density
    options.density ??= PIXI.Circle.approximateVertexDensity(this.major);

    options.clipType ??= ClipperLib.ClipType.ctIntersection;
    if ( options.clipType !== ClipperLib.ClipType.ctIntersection
      && options.clipType !== ClipperLib.ClipType.ctUnion) {
      const ellipsePolygon = this.toPolygon({ density: options.density });
      return polygon.intersectPolygon(ellipsePolygon, options);
    }

    polygon._preWApoints = [...polygon.points];

    const union = options.clipType === ClipperLib.ClipType.ctUnion;
    const wa = WeilerAthertonClipper.fromPolygon(polygon, { union, density: options.density });
    const res = wa.combine(this)[0];

    if ( !res ) {
      console.warn("Ellipse.prototype.intersectPolygon returned undefined.");
      return new PIXI.Polygon([]);
    }

    return res instanceof PIXI.Polygon ? res : res.toPolygon();
  }
}
