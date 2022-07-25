/* globals
foundry,
PIXI
*/
"use strict";

import { rotatePoint } from "./util.js";
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
    this._outerPoints = undefined;
    this._innerPoints = undefined;
  }

  /**
   * Number of points for this star shape
   * @type {number}
   */
  get numPoints() { return this.numSides; }

  /**
   * Define the "outerApothem" as the distance to the outer polygon side.
   * If this were a polygon, not a star, this would be the apothem
   */
  get outerApothem() { return this.radius * Math.cos(Math.PI / this.numSides); }

  /**
   * The apothem here is defined as the radius of the outer circle of the regular shape
   * contained in the middle of the star.
   * E.g., the outer circle radius of the inner pentagon for a 5-shaped star
   * Equivalent to the distance from the center to an inner point of the star
   */
  get apothem() {
    const { sideLength, interiorAngle, outerApothem } = this;

    // See http://mathcentral.uregina.ca/qq/database/qq.09.06/s/chetna2.html#:~:text=area%20of%20the%20star%20%3D%205,and%20vertex%20angle%20108%C2%B0.
    // Assume A and B are two outer points
    // O is the center, X is the interior point we need to calculate the apothem.
    // Need the angle at X
    const ln1_2 = sideLength / 2;
    const angle = Math.toRadians(interiorAngle) / 2;
    const height = ln1_2 / Math.tan(angle);

    return outerApothem - height;
  }

  get area() {
    console.warn("area not implemented for RegularStar");
    return super.area;
  }

  /**
   * The outer points of the star shape.
   * @type {Point}
   */
  get outerPoints() { return this._outerPoints || (this._outerPoints = super._generateFixedPoints()); }

  get innerPoints() {
    if ( !this._innerPoints ) {
      const numPoints = this.numPoints;

      const pts = this.innerCircle.toPolygon({density: numPoints}).points;
      this._innerPoints = [];
      const ln = pts.length;
      for ( let i = 0; i < ln; i += 2 ) {
        // Rotate the inner points by half the angle between the outer points
        // So the inner point lies halfway between two outerpoints
        const angle = Math.PI / (numPoints);
        const pt = rotatePoint({ x: pts[i], y: pts[i+1] }, angle);
        this._innerPoints.push(pt);
      }
    }

    return this._innerPoints;
  }

  /**
   * Generate the points of the shape in shape-space (before rotation or translation)
   * @return {Points[]}
   */
  _generateFixedPoints() {
    const { numPoints, outerPoints, innerPoints } = this;

    // Alternate between outer and inner points to construct the star
    const pts = [];
    for ( let i = 0; i < numPoints; i += 1 ) {
      pts.push(outerPoints[i]);
      pts.push(innerPoints[i]);
    }

    return pts;
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
    let prevOP = fp[0];
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
    return polygon.intersectPolygon(this.toPolygon(), {clipType, scalingFactor});
  }

}
