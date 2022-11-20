/* globals
PIXI,
canvas
*/
"use strict";

import { getFlag } from "./util.js";
import { FLAGS } from "./const.js";
import { Ellipse } from "./shapes/Ellipse.js";
import { RegularPolygon } from "./shapes/RegularPolygon.js";
import { RegularStar } from "./shapes/RegularStar.js";
import { EquilateralTriangle } from "./shapes/EquilateralTriangle.js";
import { Square } from "./shapes/Square.js";
import { Hexagon } from "./shapes/Hexagon.js";

/**
 * Method added to the light/sound AmbientLight class to create a custom boundary polygon.
 * A boundary polygon must be closed and contain the origin.
 * @return {PIXI.Polygon}
 */
export function boundaryPolygon() {
  const radius = this.data?.radius || this.radius;
  if (!radius) return undefined;

  const origin = { x: this.data.x, y: this.data.y };
  const doc = this.object.document;

  const shape = getFlag(doc, FLAGS.SHAPE) || "circle";
  const sides = getFlag(doc, FLAGS.SIDES) || 3;
  const minor = (getFlag(doc, FLAGS.ELLIPSE.MINOR) || 1) * canvas.dimensions.size / canvas.dimensions.distance;

  // Token lights rotate when the token rotates by using this.data.rotation.
  // For tokens and sounds, need to track rotation of the initial light separately.
  const rotation = (this.data.rotation ?? 0) + (getFlag(doc, FLAGS.ROTATION) ?? 0);
  switch ( shape ) {
    case "circle": return new PIXI.Circle(origin.x, origin.y, radius);

    case "ellipse": return new Ellipse(origin.x, origin.y, radius, minor, { rotation });

    case "polygon":
      switch ( Math.max(3, sides) ) {
        case 3: return new EquilateralTriangle(origin, radius, { rotation });
        case 4: return new Square(origin, radius, { rotation });
        case 6: return new Hexagon(origin, radius, { rotation});
        default: return new RegularPolygon(origin, radius, { numSides: sides, rotation });
      }

    case "star":
      return new RegularStar(origin, radius, { numPoints: Math.max(5, sides), rotation });

    case "none": return undefined;
  }
}
