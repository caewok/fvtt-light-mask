/* globals
PIXI,
canvas
*/
"use strict";

import { log } from "./module.js";
import { MODULE_ID, KEYS } from "./const.js";
import { Ellipse } from "./shapes/Ellipse.js";
import { RegularPolygon } from "./shapes/RegularPolygon.js";
import { RegularStar } from "./shapes/RegularStar.js";
import { EquilateralTriangle } from "./shapes/EquilateralTriangle.js";
import { Square } from "./shapes/Square.js";
import { Hexagon } from "./shapes/Hexagon.js";

/**
 * Method added to the light/sound AmbientLight class to create a custom boundary polygon.
 * A boundary polygon must be closed and contain the radius.
 * Called by ClockwiseSweep.
 * @param {Point}   origin      Center of the polygon.
 * @param {Number}  radius      Extent of the polygon, measured as distance from origin.
 * @param {Number}  rotation    Rotation in degrees. Default 0.
 * @return {PIXI.Polygon}
 */
export function boundaryPolygon(origin, radius, rotation = 0) {
  if (!radius) return undefined;
  const doc = this.object.document;

  const shape = doc.getFlag(MODULE_ID, KEYS.SHAPE) || "circle";
  const sides = doc.getFlag(MODULE_ID, KEYS.SIDES) || 3;
  const minor = (doc.getFlag(MODULE_ID, KEYS.ELLIPSE.MINOR) || 1) * canvas.dimensions.size / canvas.dimensions.distance;
  rotation = doc.getFlag(MODULE_ID, KEYS.ROTATION) || rotation; // Is this necessary? Possibly for sounds.

  switch ( shape ) {
    case "circle": return new PIXI.Circle(origin.x, origin.y, radius);

    case "ellipse": return new Ellipse(origin.x, origin.y, radius, minor, { rotation });

    case "polygon":
      switch ( Math.max(3, sides) ) {
        case 3: return new EquilateralTriangle(origin, radius, { rotation });
        case 4: return new Square(origin, radius, { rotation });
        case 6: return new Hexagon(origin, radius, { rotation});
        default: return new RegularPolygon(sides, origin, radius, { rotation });
      }

    case "star":
      return new RegularStar(Math.max(5, sides), origin, radius, { rotation });

    case "none": return "none";
  }
}
