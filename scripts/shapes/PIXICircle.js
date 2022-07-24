/* globals
PIXI
*/
"use strict";

/**
 * Translate a circle, shifting it in the x and y direction.
 * (Basic but useful b/c it is equivalent to polygon.translate)
 * @param {Number} dx  Movement in the x direction.
 * @param {Number} dy  Movement in the y direction.
 * @return {PIXI.Circle}
 */
function translate(dx, dy) {
  return new this.constructor(this.x + dx, this.y + dy, this.radius);
}

/**
 * Intersect this PIXI.Circle with a PIXI.Polygon.
 * Use the WeilerAtherton algorithm
 * @param {PIXI.Polygon} polygon      A PIXI.Polygon
 * @param {object} [options]          Options which configure how the intersection is computed
 * @param {number} [options.density]  The number of points which defines the density of approximation
 * @returns {PIXI.Polygon}            The intersected polygon
 */
PIXI.Circle.prototype.intersectPolygon = function(wrapped, polygon, {density, ...options}={}) {
  if ( !this.radius ) return new PIXI.Polygon([]);
  options.clipType ??= ClipperLib.ClipType.ctIntersection;

  if ( options.clipType !== ClipperLib.ClipType.ctIntersection
    && options.clipType !== ClipperLib.ClipType.ctUnion) {
    return super.intersectPolygon(polygon, options);
  }

  const union = clipType === ClipperLib.ClipType.ctUnion;
  const wa = WeilerAthertonClipper.fromPolygon(polygon, { union, density });
  const res = wa.combine(this);
  return res instanceof PIXI.Polygon ? res : res.toPolygon();

  const approx = this.toPolygon({density});
  return polygon.intersectPolygon(approx, options);
};

// ----------------  ADD METHODS TO THE PIXI.CIRCLE PROTOTYPE ------------------------
export function registerPIXICircleMethods() {
  Object.defineProperty(PIXI.Circle.prototype, "translate", {
    value: translate,
    writable: true,
    configurable: true
  });

  libWrapper.register(MODULE_ID, "PIXI.Circle.prototype.intersectPolygon", intersectPolygon, libWrapper.MIXED, { perf_mode: libWrapper.PERF_FAST });

}
