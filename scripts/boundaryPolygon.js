/* globals
PIXI
*/
"use strict";

import { SHAPE_KEY, ROTATION_KEY, MODULE_ID } from "./const.js";
import { log } from "./module.js";
import { RegularPolygon, RegularStar } from "./GeometricShapes.js";

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

  // TO-DO: Replace with sides/points and type circle, regular polygon or star or none
  // TO-DO: Add ellipse option
  const shape = this.document.getFlag(MODULE_ID, SHAPE_KEY) || "circle";
  rotation = this.document.getFlag(MODULE_ID, ROTATION_KEY) || rotation; // Is this necessary?

  log(`Using boundaryPolygon ${shape} at origin ${origin.x},${origin.y} with radius ${radius} and rotation ${rotation}`);
  switch (shape) {
    case "circle": return undefined;//new PIXI.Circle(origin.x, origin.y, radius);

    case "triangle": return RegularPolygon.build(3, origin, radius, rotation);

    case "square": return RegularPolygon.build(4, origin, radius, rotation);

    case "pentagon": return RegularPolygon.build(5, origin, radius, rotation);

    case "hexagon": return RegularPolygon.build(6, origin, radius, rotation);

    case "pentagram": return RegularStar.build(5, origin, radius, rotation);

    case "hexagram": return RegularStar.build(6, origin, radius, rotation);

    case "none": return undefined;
  }
}
