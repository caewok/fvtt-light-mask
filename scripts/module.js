/* globals
Hooks,
game,
benchmarkSight,
CONFIG
*/

'use strict';

import { MODULE_ID } from "./const.js";
import { registerLightMask } from "./patching.js";
import { LightMaskClockwiseSweepPolygon } from "./LightMaskClockwiseSweepPolygon.js";
import { lightMaskRenderAmbientLightConfig, controlledWallIDs } from "./renderAmbientLightConfig.js";

/**
 * Log message only when debug flag is enabled from DevMode module.
 * @param {Object[]} args  Arguments passed to console.log.
 */
export function log(...args) {
  try {
    const isDebugging = game.modules.get(`_dev_mode`)?.api?.getPackageDebugValue(MODULE_ID);
    if( isDebugging ) {
      console.log(MODULE_ID, `|`, ...args);
    }
  } catch (e) { 
    // empty 
  }
}



async function lightMaskBenchmarkSight(n=1000, ...args) {
  await benchmarkSight(n, ...args);
  await LightMaskClockwiseSweepPolygon.benchmark(n, ...args);
}


Hooks.once(`init`, async function() {
  log(`Initializing...`);
  
  registerLightMask();
  
  game.modules.get(MODULE_ID).api = {
    LightMaskClockwiseSweepPolygon: LightMaskClockwiseSweepPolygon,
    controlledWallIDs: controlledWallIDs,
    benchmark: lightMaskBenchmarkSight,
    fix_border_edges: true
  }
  
  CONFIG.Canvas.losBackend = LightMaskClockwiseSweepPolygon;

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
 * Add controls to the ambient light configuration
 */
Hooks.on("renderAmbientLightConfig", (app, html, data) => {
  lightMaskRenderAmbientLightConfig(app, html, data);

});


