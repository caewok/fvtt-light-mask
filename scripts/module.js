/* globals
Hooks,
game,
loadTemplates,
Handlebars
*/

"use strict";

import { MODULE_ID, TEMPLATES } from "./const.js";
import { registerLightMask } from "./patching.js";
import { registerPIXIPolygonMethods } from "./shapes/PIXIPolygon.js";
import { registerPIXIRectangleMethods } from "./shapes/PIXIRectangle.js";
import { registerPIXICircleMethods } from "./shapes/PIXICircle.js";

import {
  controlledWallIDs,
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
    shape: { RegularPolygon, EquilateralTriangle, Square, Hexagon, RegularStar, Ellipse }
  };
});

Hooks.once("setup", async function() {
  log("Setup...");
  loadTemplates(Object.values(TEMPLATES));
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

/* Render the parameters for a given selected shape */
Hooks.on("renderAmbientLightConfig", injectAmbientLightConfiguration);
Hooks.on("renderAmbientSoundConfig", injectAmbientSoundConfiguration);
Hooks.on("renderTokenConfig", injectTokenLightConfiguration);

/* Update the data for a given source */
Hooks.on("preUpdateToken", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientLight", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientSound", lightMaskPreUpdateAmbientLight);
