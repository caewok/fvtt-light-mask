/* globals
PIXI,
canvas
*/
"use strict";

import { getFlag } from "./util.js";
import { FLAGS } from "./const.js";
import { Ellipse } from "./geometry/Ellipse.js";
import { RegularPolygon } from "./geometry/RegularPolygon/RegularPolygon.js";
import { RegularStar } from "./geometry/RegularPolygon/RegularStar.js";
import { EquilateralTriangle } from "./geometry/RegularPolygon/EquilateralTriangle.js";
import { Square } from "./geometry/RegularPolygon/Square.js";
import { Hexagon } from "./geometry/RegularPolygon/Hexagon.js";

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

  // Token lights rotate when the token rotates by using this.data.rotation.
  // For tokens and sounds, need to track rotation of the initial light separately.
  const rotation = (this.data.rotation ?? 0) + (getFlag(doc, FLAGS.ROTATION) ?? 0);
  const shape = getFlag(doc, FLAGS.SHAPE) || "circle";
  switch ( shape ) {
    case "circle": return new PIXI.Circle(origin.x, origin.y, radius);

    case "ellipse": {
      const minor = (getFlag(doc, FLAGS.ELLIPSE.MINOR) || 1) * canvas.dimensions.size / canvas.dimensions.distance;
      return new Ellipse(origin.x, origin.y, radius, minor, { rotation });
    }

    case "polygon": {
      const numSides = Math.max(3, getFlag(doc, FLAGS.SIDES) || 3);
      switch ( numSides ) {
        case 3: return new EquilateralTriangle(origin, radius, { rotation });
        case 4: return new Square(origin, radius, { rotation });
        case 6: return new Hexagon(origin, radius, { rotation});
        default: return new RegularPolygon(origin, radius, { numSides, rotation });
      }
    }

    case "star": {
      const numPoints = Math.max(getFlag(doc, FLAGS.POINTS) || 5);
      return new RegularStar(origin, radius, { numPoints, rotation });
    }

    case "none": return undefined;
  }
}
