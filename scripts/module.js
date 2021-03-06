/* globals
Hooks,
game,
benchmarkSight,
CONFIG,
loadTemplates,
Handlebars
*/

"use strict";

import { MODULE_ID, TEMPLATES } from "./const.js";
import { registerLightMask } from "./patching.js";
import { registerPIXIPolygonMethods } from "./ClockwiseSweep/PIXIPolygon.js";
import { registerPIXIRectangleMethods } from "./ClockwiseSweep/PIXIRectangle.js";
import { registerPIXICircleMethods } from "./ClockwiseSweep/PIXICircle.js";
import { registerPolygonVertexMethods } from "./ClockwiseSweep/SimplePolygonEdge.js";
import { registerSettings } from "./settings.js";

import { LightMaskClockwisePolygonSweep } from "./ClockwiseSweep/LightMaskClockwisePolygonSweep.js";
import {
  controlledWallIDs,
  injectAmbientLightConfiguration,
  injectAmbientSoundConfiguration,
  injectTokenLightConfiguration } from "./render.js";

import { lightMaskPreUpdateAmbientLight } from "./preUpdate.js";

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

async function lightMaskBenchmarkSight(n=1000, ...args) {
  await benchmarkSight(n, ...args);
  await LightMaskClockwisePolygonSweep.benchmark(n, ...args);
}

Hooks.once("init", async function() {
  log("Initializing...");

  registerLightMask();
  registerPIXIPolygonMethods();
  registerPIXIRectangleMethods();
  registerPIXICircleMethods();
  registerPolygonVertexMethods();

  Handlebars.registerHelper("max2", function(a, b) { return Math.max(a, b); });

  game.modules.get(MODULE_ID).api = {
    LightMaskClockwisePolygonSweep: LightMaskClockwisePolygonSweep,
    controlledWallIDs: controlledWallIDs,
    benchmark: lightMaskBenchmarkSight
  };

  CONFIG.Canvas.losBackend = LightMaskClockwisePolygonSweep;
});

Hooks.once("setup", async function() {
  log("Setup...");
  registerSettings();
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
