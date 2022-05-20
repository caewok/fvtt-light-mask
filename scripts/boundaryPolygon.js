/* globals
PIXI
*/
"use strict";

import { log } from "./module.js";
import { RegularPolygon, RegularStar } from "./GeometricShapes.js";
import { MODULE_ID } from "./settings.js";
import { KEYS } from "./keys.js";

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

  // TO-DO: Replace with sides/points and type circle, regular polygon or star or none
  // TO-DO: Add ellipse option
  const shape = doc.getFlag(MODULE_ID, KEYS.SHAPE) || "circle";
  const sides = doc.getFlag(MODULE_ID, KEYS.SIDES) || 3;
  rotation = doc.getFlag(MODULE_ID, KEYS.ROTATION) || rotation; // Is this necessary? Possibly for sounds.

  log(`Using boundaryPolygon ${shape} at origin ${origin.x},${origin.y} with radius ${radius} and rotation ${rotation}`);
  switch (shape) {
    case "circle": return new PIXI.Circle(origin.x, origin.y, radius);

    case "polygon": return RegularPolygon.build(Math.max(3, sides), origin, radius, rotation);

    case "star": return RegularStar.build(Math.max(5, sides), origin, radius, rotation);

    case "none": return "none";
  }
}


