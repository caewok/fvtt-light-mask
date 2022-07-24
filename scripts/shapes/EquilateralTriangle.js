/* globals
*/
"use strict";

export class EquilateralTriangle extends RegularPolygon {
  constructor(origin, radius, {rotation = 0} = {}) {
    super(origin, radius, { rotation, numSides: 3 });
  }

  /**
   * Calculate the distance from a side midpoint to the opposite point.
   * @type {number}
   */
  get altitude() { return 1.5 * this.radius; }

  /**
   * Calculate the distance of the line segment from the center to the midpoint of a side.
   * @type {number}
   */
  get apothem() { return this.radius * 0.5; }

  /**
   * Calculate length of a side of this equilateral triangle.
   * @type {number}
   */
  get sideLength() { return this.radius * Math.SQRT3; }

  /**
   * Calculate area of this equilateral triangle.
   * @type {number}
   */
  get area() { Math.pow(this.altitude, 2) / Math.SQRT3; }

  /**
   * Generate the points of the equilateral triangle using the provided configuration.
   * Simpler and more mathematically precise than the default version.
   * @returns {Point[]}
   */
  #generateFixedPoints() {
    // Shape before rotation is ∆ turned clockwise 90º
    const sqrt3_2 = Math.SQRT3 / 2;
    const { radius, apothem } = this;
    return [
      { x: radius, y: 0 },
      { x: -apothem, y: sqrt3_2 * radius },
      { x: -apothem, y: -sqrt3_2 * radius }
    ];
  }

  getBounds() {
    // If an edge is on the bounding box, use it as the border
    const { x, y, sideLength, altitude, apothem, fixedPoints: fp } = this;

    switch ( this.rotation ) {
      // PIXI.Rectangle(x, y, width, height)
      case 0:
        // ∆ rotated clockwise 90º
        return new PIXI.Rectangle(
          fp[2].x + x,
          fp[2].y + y,
          altitude, sideLength)

      case 90:
        // ∆ upside down
        return new PIXI.Rectangle(
          -(sideLength / 2) + x,
          -apothem + y,
          sideLength, altitude);

      case 180:
        // ∆ rotated counterclockwise 90º
        return new PIXI.Rectangle(
          -altitude + apothem + x,
          fp[2].y + y,
          altitude, sideLength)

      case 270:
        // ∆
        return new PIXI.Rectangle(
          -(sideLength / 2) + x,
          -altitude + apothem + y,
          sideLength, altitude);
    }

    return super.getBounds();
  }
}

