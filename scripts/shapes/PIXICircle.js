/* globals
PIXI,
ClipperLib,
libWrapper
*/
"use strict";

import { WeilerAthertonClipper } from "../WeilerAtherton.js";
import { MODULE_ID } from "../const.js";

// ----------------  ADD METHODS TO THE PIXI.CIRCLE PROTOTYPE ------------------------
export function registerPIXICircleMethods() {
  // ----- Weiler Atherton Methods ----- //

  /**
   * Get the center point of the circle
   * @type {Point}
   */
  Object.defineProperty(PIXI.Circle.prototype, "center", {
    get: function() {
      return { x: this.x, y: this.y };
    },
    enumerable: false
  });

  /**
   * Get all intersection points for a segment A|B
   * Intersections are sorted from A to B.
   * @param {Point} a
   * @param {Point} b
   * @returns {Point[]}
   */
  Object.defineProperty(PIXI.Circle.prototype, "segmentIntersections", {
    value: function(a, b) {
      const ixs = foundry.utils.lineCircleIntersection(a, b, this, this.radius);
      return ixs.intersections;
    },
    writable: true,
    configurable: true
  });

  /**
   * Calculate an x,y point on this circle's circumference given an angle
   * 0: due east
   * π / 2: due south
   * π or -π: due west
   * -π/2: due north
   * @param {number} angle    Angle of the point, in radians.
   * @returns {Point}
   */
  Object.defineProperty(PIXI.Circle.prototype, "pointAtAngle", {
    value: function(angle) {
      return {
        x: this.x + (this.radius * Math.cos(angle)),
        y: this.y + (this.radius * Math.sin(angle)) };
    },
    writable: true,
    configurable: true
  });

  /**
   * Calculate the angle of a point in relation to a circle.
   * This is the angle of a line from the circle center to the point.
   * Reverse of PIXI.Circle.prototype.pointAtAngle.
   * @param {Point} point
   * @returns {number} Angle in radians.
   */
  Object.defineProperty(PIXI.Circle.prototype, "angleAtPoint", {
    value: function(point) {
      return Math.atan2(point.y - this.y, point.x - this.x);
    },
    writable: true,
    configurable: true
  });

  /**
   * Get the points that would approximate a circular arc along this circle, given
   * a starting and ending angle. Points returned are clockwise.
   * If from and to are the same, a full circle will be returned.
   *
   * @param {Point}   fromAngle     Starting angle, in radians. π is due north, π/2 is due east
   * @param {Point}   toAngle       Ending angle, in radians
   * @param {object}  [options]     Options which affect how the circle is converted
   * @param {number}  [options.density]           The number of points which defines the density of approximation
   * @param {boolean} [options.includeEndpoints]  Whether to include points at the circle
   *                                              where the arc starts and ends.
   * @returns {Point[]}
   */
  Object.defineProperty(PIXI.Circle.prototype, "pointsForArc", {
    value: pointsForArc,
    writable: true,
    configurable: true
  });

  /**
   * Get all the points for a polygon approximation of a circle between two points on the circle.
   * Points are clockwise from a to b.
   * @param { Point } a
   * @param { Point } b
   * @return { Point[]}
   */
  Object.defineProperty(PIXI.Circle.prototype, "pointsBetween", {
    value: function(a, b, { density } = {}) {
      const fromAngle = this.angleAtPoint(a);
      const toAngle = this.angleAtPoint(b);
      return this.pointsForArc(fromAngle, toAngle, { density, includeEndpoints: false });
    },
    writable: true,
    configurable: true
  });

  /**
   * Intersect this PIXI.Circle with a PIXI.Polygon.
   * Use the WeilerAtherton algorithm
   * @param {PIXI.Polygon} polygon      A PIXI.Polygon
   * @param {object} [options]          Options which configure how the intersection is computed
   * @param {number} [options.density]  The number of points which defines the density of approximation
   * @returns {PIXI.Polygon}            The intersected polygon
   */
  libWrapper.register(MODULE_ID, "PIXI.Circle.prototype.intersectPolygon", intersectPolygonPIXICircle, libWrapper.MIXED, { perf_mode: libWrapper.PERF_FAST });
}

function pointsForArc(fromAngle, toAngle, {density, includeEndpoints=true} = {}) {
  const pi2 = 2 * Math.PI;
  density ??= this.constructor.approximateVertexDensity(this.radius);
  const points = [];
  const delta = pi2 / density;

  if ( includeEndpoints ) points.push(this.pointAtAngle(fromAngle));

  // Determine number of points to add
  let dAngle = toAngle - fromAngle;
  while ( dAngle <= 0 ) dAngle += pi2; // Angles may not be normalized, so normalize total.
  const nPoints = Math.round(dAngle / delta);

  // Construct padding rays (clockwise)
  for ( let i = 1; i < nPoints; i++ ) points.push(this.pointAtAngle(fromAngle + (i * delta)));

  if ( includeEndpoints ) points.push(this.pointAtAngle(toAngle));
  return points;
}

function intersectPolygonPIXICircle(wrapped, polygon, options) {
  return wrapped(polygon, options);

  if ( !this.radius ) return new PIXI.Polygon([]);
  options.clipType ??= ClipperLib.ClipType.ctIntersection;

  if ( options.clipType !== ClipperLib.ClipType.ctIntersection
    && options.clipType !== ClipperLib.ClipType.ctUnion) {
    return wrapped(polygon, options);
  }

  const union = options.clipType === ClipperLib.ClipType.ctUnion;
  const wa = WeilerAthertonClipper.fromPolygon(polygon, { union, density: options.density });
  const res = wa.combine(this)[0];

  if ( !res ) {
    console.warn("PIXI.Circle.prototype.intersectPolygon returned undefined.");
    return new PIXI.Polygon([]);
  }

  return res instanceof PIXI.Polygon ? res : res.toPolygon();
}
