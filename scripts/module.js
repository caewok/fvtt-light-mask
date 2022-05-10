/* globals
Hooks,
game,
benchmarkSight,
CONFIG
*/

"use strict";

import { MODULE_ID } from "./const.js";

import { registerLightMask } from "./patching.js";
import { registerPIXIPolygonMethods } from "./ClockwiseSweep/PIXIPolygon.js";
import { registerPIXIRectangleMethods } from "./ClockwiseSweep/PIXIRectangle.js";
import { registerPIXICircleMethods } from "./ClockwiseSweep/PIXICircle.js";
import { registerPolygonVertexMethods } from "./ClockwiseSweep/SimplePolygonEdge.js";
import { registerSettings } from "./settings.js";

import { LightMaskClockwisePolygonSweep } from "./ClockwiseSweep/LightMaskClockwisePolygonSweep.js";
import { controlledWallIDs } from "./renderAmbientLightConfig.js";
import { lightMaskPreUpdateAmbientLight } from "./preUpdateAmbientLight.js";

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

Hooks.on("preUpdateAmbientLight", (doc, data, options, id) => {
  lightMaskPreUpdateAmbientLight(doc, data, options, id);
});


Hooks.on("preUpdateAmbientSound", (doc, data, options, id) => {
  lightMaskPreUpdateAmbientLight(doc, data, options, id);
});
