/* globals
*/
"use strict";

/**
 * Square is oriented at 0º rotation like a diamond.
 * Special case when square is rotate 45º or some multiple thereof
 * @param {Point} origin  Center point of the square
 * @param {number} radius Circumscribed circle radius
 * @param {object} options
 * @param {number} [options.rotation]   Rotation in degrees
 * @param {number} [options.width]      Alternative specification when skipping radius
 */
export class Square extends RegularPolygon {
  constructor(origin, radius, {rotation = 0, width} = {}) {
    radius ??= Math.sqrt(Math.pow(width, 2) * 2);
    super(origin, radius, { rotation, numSides: 4 });

    this.width = width ?? (this.radius * Math.SQRT2);
  }

  /**
   * Calculate the distance of the line segment from the center to the midpoint of a side.
   * @type {number}
   */
  get apothem() { return this.width; }

  /**
   * Calculate length of a side of this square.
   * @type {number}
   */
  get sideLength() { return this.apothem * 2; }

  /**
   * Calculate area of this square.
   * @type {number}
   */
  get area() { this.sideLength * 2; }

  /**
   * Construct a square like a PIXI.Rectangle, where the point is the top left corner.
   */
  static fromPoint(point, width) {
    const w1_2 = width / 2;
    return new this({x: point.x + w1_2, y: point.y + w1_2}, undefined, { rotation: 45, width })
  }

  /**
   * Construct a square from a token's hitArea.
   * @param {Token} token
   * @return {Hexagon}
   */
  static fromToken(token) {
    const { x, y } = this.token.center;
    const { width, height } = this.token.hitArea;

    if ( width !== height ) return new PIXI.Rectangle(x, y, width, height);

    return this.fromPoint({x, y}, width);
  }

  /**
   * Generate the points of the square using the provided configuration.
   * Simpler and more mathematically precise than the default version.
   * @returns {Point[]}
   */
  #generateFixedPoints() {
    // Shape before rotation is [] rotated 45º
    const r = this.radius;

    return [
      { x: r, y: 0 },
      { x: 0, y: r },
      { x: -r, y: r },
      { x: 0, y: -r }
    ];
  }

  /**
   * Generate the points that represent this shape as a polygon in Cartesian space.
   * @return {Points[]}
   */
  _generatePoints() {
    const { x, y, rotation, apothem } = this;

    switch ( rotation ) {
      // oriented []
      case 45:
      case 135:
      case 225:
      case 315:
        return [
          { x: apothem + x, y: apothem + y },
          { x: -apothem + x, y: apothem + y },
          { x: -apothem + x, y: -apothem + y },
          { x: apothem + x, y: -apothem + y },
        ]

      // oriented [] turned 45º
      case 0:
      case 90:
      case 180:
      case 270:
        return [
          { x: r + x, y},
          { x, y: r + y },
          { x: -r + x, y: r + y},
          { x, y: -r + y }
        ];
    }

    return super._generatePoints();
  }

  getBounds() {
    // If an edge is on the bounding box, use it as the border
    const { x, y, sideLength, apothem, fixedPoints: fp } = this;

    switch ( this.rotation ) {
      // PIXI.Rectangle(x, y, width, height)
      // oriented []
      case 45:
      case 135:
      case 225:
      case 315:
        return new PIXI.Rectangle(-apothem + x, -apothem + y, sideLength, sideLength);

      // oriented [] turned 45º
      case 0:
      case 90:
      case 180:
      case 270:
        return new PIXI.Rectangle(fp[2], fp[3], sideLenth, sideLength);
    }

    return super.getBounds();
  }
}
