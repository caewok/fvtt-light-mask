/* globals
*/
"use strict";

import { midPoint } from "./util.js";
import { RegularPolygon } from "./RegularPolygon.js";

/**
 * A regular star is a polygon built from a regular polygon by
 * intersecting diagonals between every vertex. The resulting polygon is
 * star-shaped. For example, take a pentagon and intersect the diagonals connecting
 * the five vertices: those intersections plus outside vertices create a five-point star.
 * A 3-point star is just a triangle.
 * A 4-point star is an X.
 *
 * See https://martiancraft.com/blog/2017/03/geometry-of-stars/
 */
export class RegularStar extends RegularPolygon {
  constructor(origin, radius, { numPoints = 5, rotation = 0} = {}) {
    super(origin, radius, { numSides: numPoints, rotation});

    // Placeholders for getters
    this._outsidePoints = undefined;
  }

  /**
   * Number of points for this star shape
   * @type {number}
   */
  get numPoints() { return this.numSides; }

  /**
   * Apothem here defined as the radius of the outer circle of the regular shape
   * contained in the middle of the star.
   * E.g., the outer circle radius of the inner pentagon for a 5-shaped star
   * Equivalent to the distance from the center to an inner point of the star
   */
  get apothem() {
    const { outerPoints: op, numPoints } = this;

    // The midpoint of the line between the two outer points
    const midPoint = midPoint(op[0], op[1]);
    if ( numPoints < 5 ) return Math.hypot(midPoint.x - center.x, midPoint.y - center.y) * 0.5;

    // The internal angle of the regular shape at the center of this star
    const internalAngle = ((numPoints - 2) * Math.PI) / numPoints;

    // Length of the line from op[0] to midPoint
    const opp = Math.hypot(midpoint.x - op[0].x, midpoint.y - op[0].y);
    const theta = internalAngle * 0.5;
    const distanceIn = opp / Math.tan(theta);

    return Math.hypot(midPoint.x - center.x, midPoint.y - center.y) - distanceIn;
  }

  get sideLength() {
    console.warn("sideLength not implemented for RegularStar");
    return super.sideLength;
  }

  get area() {
    console.warn("area not implemented for RegularStar");
    return super.area;
  }

  /**
   * The outer points of the star shape.
   * @type {Point}
   */
  get outerPoints() { return this._outerPoints || (this._outerPoints = super.#generateFixedPoints()); }
  get innerPoints() {
    this.innerCircle.toPolygon({density: this.numPoints})
  }

  /**
   * Generate the points of the shape in shape-space (before rotation or translation)
   * @return {Points[]}
   */
  #generateFixedPoints() {
    const { numSides, radius } = this;

    const outer_pts = this.outerPoints;

    // Construct the segments connecting the outside points to form a star.
    const diagonals = outer_pts.map((pt, idx) => {
      const dest = (idx + 2) % points;
      return new Ray(pt, outer_pts[dest]);
    });

    // The concave points of the star are found at the intersections of the diagonals.
    const ix = diagonals.map((d, idx) => {
      const near = (idx + (points - 1)) % points;
      const near_d = diagonals[near];
      return foundry.utils.lineLineIntersection(d.A, d.B, near_d.A, near_d.B);
    });

    // Walk the star along diagonals to form the shape
    const pts = [];
    diagonals.forEach((d, idx) => {
      // Diagonal goes A1 -- x1 -- y1 -- B1
      // For 5 points, we have:
      // A1 -- x1 -- A2 -- x2 -- A3 -- x3 -- A4 -- x4 -- A5 -- x5
      pts.push(d.A, ix[idx]);
    });

    return new this(pts);
  }

  /**
   * Does the shape contain the point?
   * @param {number} x
   * @param {number} y
   * @returns {boolean} True if point {x,y} is contained within the triangle.
   */
  contains(x, y) {
    const pt = this.fromCartesianCoords({ x, y });

    // Test the outer and inner circles
    if ( !this.outerCircle.contains(pt.x, pt.y) ) return false;
    if ( this.innerCircle.contains(pt.x, pt.y) ) return true;

    const pt = this.fromCartesianCoords({ x, y });

    // Use orientation to test the point.
    // Moving clockwise, must be clockwise to each side (meaning, the outside points)
    const { outsidePoints: op, numSides } = this;
    for ( let i = 0; i < numSides; i += 1 ) {
      const op0 = op[i];
      const op1 = op[(i + 1) % numSides];
      if ( foundry.utils.orient2dFast(op0, op1, pt) >= 0 ) return false;
    }

    // Point could still be between the spaces of the points.
    // MOAR orientation -- from each inner point, cannot be cw and ccw to those edges
    // extending from the inner point
    // First point is outer
    const { fixedPoints: fp } = this;
    const ln = fp.length;
    const prevOP = fp[0];
    for ( let i = 1; i < ln; i += 2 ) {
      const nextOP = fp[(i + 1) % ln];
      const ip = fp[i];
      if ( foundry.utils.orient2dFast(ip, prevOP, pt) <= 0
        && foundry.utils.orient2dFast(ip, nextOP, pt) >= 0 ) return false;
      prevOP = nextOP;
    }

    return true;
  }

  pointsBetween(a, b) {
    console.warn("pointsBetween not implemented for RegularStar");
    return super.pointsBetween(a, b);
  }

  _getSide(point) {
    console.warn("_getSide not implemented for RegularStar");
    return super._getSide(point);
  }

  _checkSide(point) {
    console.warn("_checkSide not implemented for RegularStar");
    return super._checkSide(point);
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
      return super.super.intersectPolygon(polygon, {clipType, scalingFactor});
    }
  }

}
