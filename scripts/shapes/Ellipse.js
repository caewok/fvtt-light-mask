/* globals
PIXI,
ClipperLib
*/
"use strict";

import { rotatePoint, translatePoint } from "./util.js";
import { WeilerAthertonClipper } from "../WeilerAtherton";

/*
  e = new Ellipse(1000, 1000, 400, 100);
  drawShape(e);
  poly = e.toPolygon()
  drawShape(poly, {color: COLORS.blue})

  // Intersecting segment
  a = {x: 500, y: 600}
  b = {x: 800, y: 1600}
  drawSegment({A: a, B: b})

  ixs = e.segmentIntersections(a, b)
  ixs.forEach(ix => drawPoint(ix))

  pts = e.pointsBetween(ixs[0], ixs[1])
  pts.forEach(pt => drawPoint(pt, {color: COLORS.blue}))


  e = new Ellipse(1000, 1000, 400, 100, { rotation: 90});
  poly = e.toPolygon()
  drawShape(poly, {color: COLORS.blue})

  // Intersecting segment
  a = {x: 900, y: 600}
  b = {x: 1100, y: 1600}
  drawSegment({A: a, B: b})

  ixs = e.segmentIntersections(a, b)
  ixs.forEach(ix => drawPoint(ix))

  pts = e.pointsBetween(ixs[0], ixs[1])
  pts.forEach(pt => drawPoint(pt, {color: COLORS.blue}))



  // at 0,0 coords
  eZ = new Ellipse(0, 0, 100, 400)
  eZ = new Ellipse(0, 0, 400, 100)

  poly = eZ.toPolygon()

  drawShape(eZ)
  drawShape(poly)

  cir = eZ._toCircle()
  drawShape(cir)

  cirPoly = cir.toPolygon({density: 12})
  cirPts = [];
  for ( let i = 0; i < cirPoly.points.length; i += 2 ) {
    cirPts.push({x: cirPoly.points[i], y: cirPoly.points[i + 1]})
  }
  cirPts.forEach(pt => drawPoint(pt, {radius: 3}))

  ePts = cirPts.map(pt => eZ.fromCircleCoords(pt))
  ePts.forEach(pt => drawPoint(pt, {radius: 3, color: COLORS.blue}))




  pts = [
    {x: e.x - e.width, y: e.y},
    {x: e.x, y: e.y - e.height},
    {x: e.x + e.width, y: e.y},
    {x: e.x, y: e.y + e.height}
  ]
  pts.forEach(pt => drawPoint(pt))

  ptsS = pts.map(pt => { return {x: pt.x / 4, y: pt.y}; })
  ptsS.forEach(pt => drawPoint(pt, {color: COLORS.blue}))

*/

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
  get area() { return Math.PI * this.width * this.height; }

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
    const m2 = this.major * 2;
    // Bounds rectangle measured from top left corner. x, y, width, height
    switch ( this.rotation ) {
      case 0:
      case 180:
        return super.getBounds();

      case 90:
      case 270:
        return new PIXI.Rectangle(this.x - this.minor, this.y - this.major, this.minor * 2, m2);
    }

    // Default to bounding box of the radius circle
    return new PIXI.Rectangle(this.x - this.major, this.y - this.major, m2, m2);
  }

  /**
   * Test whether the ellipse contains a given point.
   * @param {Point} p
   * @return {Boolean}
   */
  containsPoint(p) {
    // Use the equation for an ellipse
    // See https://math.stackexchange.com/questions/76457/check-if-a-point-is-within-an-ellipse
    // (x - h)^2 / rx^2 + (y - k)^2 / ry^2 ≤ 1
    // --> ry^2*(x-h)^2 + rx^2*(y-k)^2 ≤ rx^2*ry^2
    // h,k is ellipse origin
    // x,y is the point to test
    // rx = semi-major axis; ry = semi-minor axis
    const rx2 = Math.pow(this.major, 2);
    const ry2 = Math.pow(this.minor, 2);
    const left = ((Math.pow(p.x - this.x, 2) * ry2) + (Math.pow(p.y - this.y, 2) * rx2));
    const right = (rx2 * ry2);
    return left <= right || left.almostEqual(right);
  }

  contains(x, y) { return this.containsPoint({x, y}); }

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
  intersectPolygon(polygon, { density, clipType, scalingFactor } = {}) {
    if ( !this.major || !this.minor ) return new PIXI.Polygon([]);

    // Default to the larger radius for density
    density ??= PIXI.Circle.approximateVertexDensity(this.major);

    clipType ??= ClipperLib.ClipType.ctIntersection;
    if ( clipType !== ClipperLib.ClipType.ctIntersection
      && clipType !== ClipperLib.ClipType.ctUnion) {
      const ellipsePolygon = this.toPolygon({density});
      return polygon.intersectPolygon(ellipsePolygon, {clipType, scalingFactor});
    }

    const union = clipType === ClipperLib.ClipType.ctUnion;
    const wa = WeilerAthertonClipper.fromPolygon(polygon, { union, density });
    const res = wa.combine(this);
    return res instanceof PIXI.Polygon ? res : res.toPolygon();
  }
}
