/* globals
Hooks,
game,
loadTemplates,
Handlebars
*/

"use strict";

import { MODULE_ID, TEMPLATES, SHAPE, KEYS } from "./const.js";
import { registerLightMask } from "./patching.js";
import { registerPIXIPolygonMethods } from "./shapes/PIXIPolygon.js";
import { registerPIXIRectangleMethods } from "./shapes/PIXIRectangle.js";
import { registerPIXICircleMethods } from "./shapes/PIXICircle.js";

import { controlledWallIDs } from "./customEdges.js";

import {
  injectAmbientLightConfiguration,
  injectAmbientSoundConfiguration,
  injectTokenLightConfiguration } from "./render.js";

import { lightMaskPreUpdateAmbientLight } from "./preUpdate.js";

// ----- WeilerAtherton ----- //
import { WeilerAthertonClipper } from "./WeilerAtherton.js";

// ----- Shapes ----- //
import { RegularPolygon } from "./shapes/RegularPolygon.js";
import { EquilateralTriangle } from "./shapes/EquilateralTriangle.js";
import { Square } from "./shapes/Square.js";
import { Hexagon } from "./shapes/Hexagon.js";
import { RegularStar } from "./shapes/RegularStar.js";
import { Ellipse } from "./shapes/Ellipse.js";

// ----- ClockwiseSweep ----- //
import { TempWall } from "./customEdges.js";

/**
 * Log message only when debug flag is enabled from DevMode module.
 * @param {Object[]} args  Arguments passed to console.log.
 */
export function log(...args) {
  try {
    const isDebugging = game.modules.get("_dev-mode")?.api?.getPackageDebugValue(MODULE_ID);
    if (isDebugging) {
      console.log(MODULE_ID, "|", ...args);
    }
  } catch(e) {
    // Empty
  }
}

Hooks.once("init", async function() {
  log("Initializing...");

  registerLightMask();
  registerPIXIPolygonMethods();
  registerPIXIRectangleMethods();
  registerPIXICircleMethods();

  Handlebars.registerHelper("max2", function(a, b) { return Math.max(a, b); });

  game.modules.get(MODULE_ID).api = {
    controlledWallIDs,
    WeilerAthertonClipper,
    shapes: { RegularPolygon, EquilateralTriangle, Square, Hexagon, RegularStar, Ellipse },
    TempWall
  };
});

Hooks.once("setup", async function() {
  log("Setup...");
  loadTemplates(Object.values(TEMPLATES));
});

Hooks.once("ready", async function() {
  log("Ready...")
});

/**
 * Tell DevMode that we want a flag for debugging this module.
 * https://github.com/League-of-Foundry-Developers/foundryvtt-devMode
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});

/**
 * Redraw lights/sounds once the canvas is loaded
 * Cannot use walls to draw lights/sounds until canvas.walls.quadtree is loaded.
 */
Hooks.on("canvasReady", async canvas => {
  log("Refreshing templates on canvasReady.");
  canvas.lighting.placeables.forEach(l => {
    l.updateSource();
  });

  canvas.sounds.placeables.forEach(s => {
    s.updateSource();
  });
});

/**
 * A hook event that fires when a {@link PlaceableObject} is initially drawn.
 * The dispatched event name replaces "Object" with the named PlaceableObject subclass, i.e. "drawToken".
 * @event drawObject
 * @category PlaceableObject
 * @param {PlaceableObject} object    The object instance being drawn
 */
Hooks.on("drawAmbientLight", setObjectFlagDefaults);
Hooks.on("drawAmbientSound", setObjectFlagDefaults);

/**
 * Helper to set the default flags for a light or sound object.
 * @param {AmbientLight|AmbientSound} object
 */
function setObjectFlagDefaults(object) {
  log(`Drawing ${object.id}`);

  // Set default flags if not set already
  // Probably don't need to await each of these, as we are not using the flags yet.
  if ( !object.document.getFlag(MODULE_ID, KEYS.SHAPE) ) object.document.setFlag(MODULE_ID, KEYS.SHAPE, SHAPE.TYPES.CIRCLE);
  if ( !object.document.getFlag(MODULE_ID, KEYS.SIDES) ) object.document.setFlag(MODULE_ID, KEYS.SIDES, 3);
  if ( !object.document.getFlag(MODULE_ID, KEYS.POINTS) ) object.document.setFlag(MODULE_ID, KEYS.POINTS, 5);
  if ( !object.document.getFlag(MODULE_ID, KEYS.ELLIPSE.MINOR) ) object.document.setFlag(MODULE_ID, KEYS.ELLIPSE.MINOR, 1);
}


/* Render the parameters for a given selected shape */
Hooks.on("renderAmbientLightConfig", injectAmbientLightConfiguration);
Hooks.on("renderAmbientSoundConfig", injectAmbientSoundConfiguration);
Hooks.on("renderTokenConfig", injectTokenLightConfiguration);

/* Update the data for a given source */
Hooks.on("preUpdateToken", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientLight", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientSound", lightMaskPreUpdateAmbientLight);
