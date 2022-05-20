/* globals
PIXI
*/
"use strict";

/**
 * Ellipse class structured similarly to PIXI.Circle
 * - x, y center
 * - major, minor axes
 * - rotation
 */
export class Ellipse {
  /**
   * Default representation has the major axis horizontal, minor axis vertical
   *
   * @param {Number}  x       Center of ellipse
   * @param {Number}  y       Center of ellipse
   * @param {Number}  major   Semi-major axis
   * @param {Number}  minor   Semi-minor axis
   * Optional:
   * @param {Number}  rotation  Amount in degrees the ellipse is rotated
   */
  constructor(x, y, major, minor, { rotation = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.major = major;
    this.minor = minor;
    this.rotation = Math.normalizeDegrees(rotation);
  }

  /**
   * Area of the ellipse
   * @return {Number}
   */
   area() { return Math.PI * this.major * this.minor }

  /**
   * Bounding box of the ellipse
   * @return {PIXI.Rectangle}
   */
  getBounds() {
    const m2 = this.major * 2;
    if(this.rotation === 0 || this.rotation === 180) {
      // Rectangle measured from top left corner. x, y, width, height
      return new PIXI.Rectangle(this.x - this.major, this.y - this.minor, m2, this.minor * 2);
    }

    if(this.rotation === 90 || this.rotation === 270) {
      // Rectangle measured from top left corner. x, y, width, height
      return new PIXI.Rectangle(this.x - this.minor, this.y - this.major, this.minor * 2, m2);
    }

    // Default to bounding box of the radius circle
    return new PIXI.Rectangle(this.x - this.major, this.y - this.major, m2, m2);
  }

  /**
   * Translate the ellipse, shifting it in the x and y direction.
   * @param {Number}  delta_x  Movement in the x direction.
   * @param {Number}  delta_y  Movement in the y direction.
   */
  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
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
  * Iterator to convert to set of points given a density
  * @param {Number} density
  * @return {Point[]}
  */
 *points({ density = 60 } = {}) {
   // See https://www.geeksforgeeks.org/how-to-discretize-an-ellipse-or-circle-to-a-polygon-using-c-graphics/
   const pi2 = Math.PI * 2;
   const rot = this.rotation;

   // translation matrix:
   // 1 0 this.x
   // 0 1 this.y
   // 0 0 1

   // rotation matrix, where Ø = this.rotation
   //  cos(Ø) sin(Ø) 0
   // -sin(Ø) cos(Ø) 0
   //  0      0      1

   // u = TRv
   // v = {x, y, 1}

   // Translation * Rotation matrices
   // 1 * cos(Ø) + 0 * -sin(Ø) + this.x * 0   1 * sin(Ø) + 0 * cos(Ø) + this.x * 0   1 * 0 + 0 * 0 + this.x * 1
   // 0 * cos(Ø) + 1 * -sin(Ø) + this.y * 0   0 * sin(Ø) + 1 * cos(Ø) + this.y * 0   0 * 0 + 1 * 0 + this.y * 1
   // 0 * cos(Ø) + 0 * -sin(Ø) + 1 * 0        0 * sin(Ø) + 0 * cos(Ø) + 1 * 0        0 * 0 + 0 * 0 + 1 * 1
   // -->
   //  cos(Ø)   sin(Ø)   this.x
   // -sin(Ø)   cos(Ø)   this.y
   //  0        0        1

   // Times [x, y, 1]
   // cos(Ø) * x + sin(Ø) * y + this.x * 1
   // -sin(Ø) * x + cos(Ø) * y + this.y * 1
   // 0 * x + 0 * y + 1 * 1
   // -->
   // cos(Ø) * x +  sin(Ø) * y + this.x
   // -sin(Ø) * x + cos(Ø) * y + this.y
   // 1

   const cos_rot = Math.cos(Math.toRadians(rot));
   const sin_rot = Math.sin(Math.toRadians(rot));

   let angle_shift = pi2 / density; // convert angle shift to radians
   let phi = 0;
   for ( let i = 0; i < density; i += 1 ) {
     const x = this.major * Math.cos(phi);
     const y = this.minor * Math.sin(phi);

     const xt = cos_rot * x + sin_rot * y + this.x;
     const yt = -sin_rot * x + cos_rot * y + this.y;

     yield {x: xt, y: yt};
     phi += angle_shift;
   }
 }

 /**
  * Convert to a polygon
  * @return {PIXI.Polygon}
  */
  toPolygon({ density = 60} = {}) {
    return new PIXI.Polygon([...this.points({ density })]);
  }

 /**
  * Intersect a polygon
  * @param {PIXI.Polygon} poly
  * @return {PIXI.Polygon}
  */
  intersectPolygon(poly, { density = 60 } = {}) {
    return poly.intersectPolygon(this.toPolygon({ density }));
  }
}