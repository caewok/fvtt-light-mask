/* globals
Hooks,
game,
benchmarkSight,
CONFIG
*/

'use strict';

import { MODULE_ID } from "./const.js";

import { registerLightMask } from "./patching.js";
import { registerPIXIPolygonMethods } from "./ClockwiseSweep/PIXIPolygon.js";
import { registerPIXIRectangleMethods } from "./ClockwiseSweep/PIXIRectangle.js";
import { registerPIXICircleMethods } from "./ClockwiseSweep/PIXICircle.js";
import { registerPolygonVertexMethods } from "./ClockwiseSweep/SimplePolygonEdge.js";

import { LightMaskClockwisePolygonSweep } from "./ClockwiseSweep/LightMaskClockwisePolygonSweep.js";
import { lightMaskRenderAmbientLightConfig, controlledWallIDs } from "./renderAmbientLightConfig.js";
import { lightMaskPreUpdateAmbientLight } from "./preUpdateAmbientLight.js";

import * as ClipperLib from "./ClockwiseSweep/clipper_unminified.js"; // eslint-disable-line no-unused-vars

/**
 * Log message only when debug flag is enabled from DevMode module.
 * @param {Object[]} args  Arguments passed to console.log.
 */
export function log(...args) {
  try {
    const isDebugging = game.modules.get(`_dev-mode`)?.api?.getPackageDebugValue(MODULE_ID);
    if( isDebugging ) {
      console.log(MODULE_ID, `|`, ...args);
    }
  } catch (e) {
    // empty
  }
}



async function lightMaskBenchmarkSight(n=1000, ...args) {
  await benchmarkSight(n, ...args);
  await LightMaskClockwisePolygonSweep.benchmark(n, ...args);
}


Hooks.once(`init`, async function() {
  log(`Initializing...`);

  registerLightMask();
  registerPIXIPolygonMethods();
  registerPIXIRectangleMethods();
  registerPIXICircleMethods();
  registerPolygonVertexMethods();

  game.modules.get(MODULE_ID).api = {
    LightMaskClockwisePolygonSweep: LightMaskClockwisePolygonSweep,
    controlledWallIDs: controlledWallIDs,
    benchmark: lightMaskBenchmarkSight
  }

  CONFIG.Canvas.losBackend = LightMaskClockwisePolygonSweep;

  // CONFIG.Canvas.losBackend = game.modules.get(`lightmask`).api.LightMaskClockwiseSweepPolygon
  // game.modules.get(`lightmask`).api.controlledWallIDs()

});

Hooks.once(`setup`, async function() {
  log(`Setup...`);
});

Hooks.once(`ready`, async function() {
  log(`Ready...`);
})

/**
 * Tell DevMode that we want a flag for debugging this module.
 * https://github.com/League-of-Foundry-Developers/foundryvtt-devMode
 */
Hooks.once(`devModeReady`, ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});

/**
 * Redraw lights/sounds once the canvas is loaded
 * Cannot use walls to draw lights/sounds until canvas.walls.quadtree is loaded.
 */
Hooks.on("canvasReady", async (canvas) => {
  log(`Refreshing templates on canvasReady.`);
  canvas.lighting.placeables.forEach(l => {
    // t.refresh();
    l.updateSource();
  });

  canvas.sounds.placeables.forEach(s => {
    // t.refresh();
    s.updateSource();
  });
});

/**
 * Add controls to the ambient light configuration
 */
Hooks.on("renderAmbientLightConfig", (app, html, data) => {
  lightMaskRenderAmbientLightConfig(app, html, data);

});


Hooks.on("preUpdateAmbientLight", (doc, data, options, id) => {
  lightMaskPreUpdateAmbientLight(doc, data, options, id);
});

/**
 * Add controls to the ambient sound configuration
 */
Hooks.on("renderAmbientSoundConfig", (app, html, data) => {
  lightMaskRenderAmbientLightConfig(app, html, data);

});


Hooks.on("preUpdateAmbientSound", (doc, data, options, id) => {
  lightMaskPreUpdateAmbientLight(doc, data, options, id);
});



