/* globals
PIXI,
Ray,
foundry
*/
"use strict";

/*
Functions that will construct a boundary polygon for the sweep of a given shape,
given origin, radius, rotation.

To be used as callback functions in ClockwiseSweep.
*/


/**
 * A regular polygon is one whose sides and angles are all the same.
 * e.g., triangle, square, pentagon, hexagon, etc.
 */
export class RegularPolygon extends PIXI.Polygon {
  // Keep the PIXI.Polygon constructor as a private constructor

  /**
   * Construct a regular polygon given specific parameters.
   * @param {Number} sides       Number of sides.
   * @param {Point}  origin      Center of the polygon.
   * @param {Number} radius      Distance from origin to each vertex of the polygon.
   * @param {Number} rotation    Angle in degrees describing rotation from due east.
   * @return {RegularPolygon}
   */
  static build(sides, origin, radius, rotation = 0) {
    if (sides < 3) {
      console.error("RegularPolygon must have at least 3 sides.");
      return;
    }

    const angles = Array(sides).fill(360).map((deg, idx) => (deg / sides) * idx);
    const pts = geometricShapePoints(angles, origin, radius, rotation);
    return new this(pts);
  }
}

/**
 * A regular star is a polygon built from a regular polygon by
 * intersecting diagonals between every vertex. The resulting polygon is
 * star-shaped. For example, take a pentagon and intersect the diagonals connecting
 * the five vertices: those intersections plus outside vertices create a five-point star.
 * A 3-point star is just a triangle.
 * A 4-point star is an X.
 * Both 3-points and 4-points are rejected as invalid.
 */
export class RegularStar extends PIXI.Polygon {
  // Keep the PIXI.Polygon constructor as a private constructor

  /**
   * Construct a regular star polygon given specific parameters.
   * @param {Number} points      Number of points.
   * @param {Point}  origin      Center of the polygon.
   * @param {Number} radius      Distance from origin to each vertex of the polygon.
   * @param {Number} rotation    Angle in degrees describing rotation from due east.
   * @return {RegularPolygon}
   */
  static build(points, origin, radius, rotation = 0) {
    if (points < 5) {
      console.error("RegularStarPolygon must have at least 5 points.");
      return;
    }

    const outside_angles = Array(points).fill(360).map((deg, idx) => (deg / points) * idx);
    const outside_pts = geometricShapePoints(outside_angles, origin, radius, rotation);

    // Construct the segments connecting the outside points to form a star.
    const diagonals = outside_pts.map((pt, idx) => {
      const dest = (idx + 2) % points;
      return new Ray(pt, outside_pts[dest]);
    });

    // The concave points of the star are found at the intersections of the diagonals.
    const ix = diagonals.map((d, idx) => {
      const near = (idx + (points - 1)) % points;
      const near_d = diagonals[near];
      return foundry.utils.lineLineIntersection(d.A, d.B, near_d.A, near_d.B);
    });

    // Walk the star along diagonals to form the
    const pts = [];
    diagonals.forEach((d, idx) => {
      // Diagonal goes A1 -- x1 -- y1 -- B1
      // For 5 points, we have:
      // A1 -- x1 -- A2 -- x2 -- A3 -- x3 -- A4 -- x4 -- A5 -- x5
      pts.push(d.A, ix[idx]);
    });

    return new this(pts);
  }
}

/**
 * Build a geometric shape given a set of angles.
 * @param {Number[]} angles      Array of angles indicating vertex positions.
 * @param {Point}    origin      Center of the shape.
 * @param {Number}   radius      Distance from origin to each vertex.
 * @param {Number}   rotation    Angle in degrees describing rotation from due east.
 * @return {Points[]} Array of vertices.
 */
function geometricShapePoints(angles, origin, radius, rotation = 0) {
  const a_translated = angles.map(a => Math.normalizeRadians(Math.toRadians(a + rotation)));
  return a_translated.map(a => pointFromAngle(origin, a, radius));
}

/**
 * Same as Ray.fromAngle but returns a point instead of constructing the full Ray.
 * @param {Point}   origin    Starting point.
 * @param {Number}  radians   Angle to move from the starting point.
 * @param {Number}  distance  Distance to travel from the starting point.
 * @return {Point}  Coordinates of point that lies distance away from origin along angle.
 */
function pointFromAngle(origin, radians, distance) {
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  return { x: origin.x + (dx * distance), y: origin.y + (dy * distance) };
}

