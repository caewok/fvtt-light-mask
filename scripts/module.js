/* globals
Hooks,
game, 
canvas
*/

'use strict';

import { MODULE_ID, SHAPE_KEY, CUSTOM_IDS_KEY } from "./const.js";
import { registerLightMask } from "./patching.js";
import { LightMaskClockwiseSweepPolygon } from "./LightMaskClockwiseSweepPolygon.js";

/**
 * Log message only when debug flag is enabled from DevMode module.
 * @param {Object[]} args  Arguments passed to console.log.
 */
export function log(...args) {
  try {
    const isDebugging = true;// game.modules.get(`_dev_mode`)?.api?.getPackageDebugValue(MODULE_ID);
    if( isDebugging ) {
      console.log(MODULE_ID, `|`, ...args);
    }
  } catch (e) { 
    // empty 
  }
}

function controlledWallIDs() {
  const walls = canvas.walls.controlled;
  if(walls.length === 0) {
    console.warn("Please select one or more walls on the canvas.");
    return;
  }
  
  const id = walls.map(w => w.id);
  return id.join(",");
}


Hooks.once(`init`, async function() {
  log(`Initializing...`);
  
  registerLightMask();
  
  game.modules.get(MODULE_ID).api = {
    LightMaskClockwiseSweepPolygon: LightMaskClockwiseSweepPolygon,
    controlledWallIDs: controlledWallIDs
  }
  
  // CONFIG.Canvas.losBackend = LightMaskClockwiseSweepPolygon;
  // or
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
 * Add a selector to the ambient light configuration
 * templates/scene/ambient-light-config.html
 * follows approach in https://github.com/erithtotl/wall-height/blob/master/scripts/wall-height.js
 */
Hooks.on("renderAmbientLightConfig", (app, html, data) => {
  
  log(`Hooking renderAmbientLightConfig!`, data);
  
  const moduleLabel = `Light Mask`;  
  const shapeLabel = `Shape`;  
  const idLabel = `Custom: Add Wall IDs`;
  
  /*
  data.lightMaskShapes = { 
    circle: "Circle", 
    triangle: "Triangle",
    square: "Square",
    hexagon: "Hexagon",
    custom: "Custom"
  }
  */
  
  // insert in the advanced tab after the last group
  // advanced tab is last tab
  /*
  html.find(".form-group").last().after(`
  <fieldset>
    <legend>${moduleLabel}</legend>
      <div class="form-group">
        <label for="${moduleScope}.shapes">${shapeLabel}</label>
        <select id="${moduleScope}.shapes" name="flags.${moduleScope}.${SHAPE_KEY}">
          {{selectOptions lightMaskShapes selected=data.flags.${moduleScope}.${SHAPE_KEY} }}
        </select>  
      </div>
          
      <div class="form-group">
        <label>${idLabel}</label>
        <input name=flags.${moduleScope}.${WALL_ID_KEY}" type="text" data-dtype="text" value=${ids}>
      </div>
    </legend>
  </fieldset>
  `);
  */
  
  const current_shape = data.data.flags?.[MODULE_ID]?.[SHAPE_KEY] || "circle";
  log(`Current shape is ${current_shape}.`);
  
  const current_custom = data.data.flags?.[MODULE_ID]?.[CUSTOM_IDS_KEY] || '';
  log(`Current custom is ${current_custom}.`);
  
  html.find(".form-group").last().after(`
  <fieldset>
    <legend>${moduleLabel}</legend>
      <div class="form-group">
        <label for="${MODULE_ID}.shapes">${shapeLabel}</label>
        <select id="${MODULE_ID}.shapes" name="flags.${MODULE_ID}.${SHAPE_KEY}">
          <option value="circle" ${current_shape === "circle" ? "selected" : ""}>Circle</option>
          <option value="triangle" ${current_shape === "triangle" ? "selected" : ""}>Triangle</option>
          <option value="square" ${current_shape === "square" ? "selected" : ""}>Square</option>
          <option value="hexagon" ${current_shape === "hexagon" ? "selected" : ""}>Hexagon</option>
          <option value="none" ${current_shape === "none" ? "selected" : ""}>None</option>
        </select>  
      </div>
          
      <div class="form-group">
        <label>${idLabel}</label>
        <input name="flags.${MODULE_ID}.${CUSTOM_IDS_KEY}" type="text" data-dtype="text" value=${current_custom}>
      </div>
    </legend>
  </fieldset>
  `); 
  
  
  // to find the data, get a light.
  // l = [...canvas.lighting.sources][0]
  // l.object.data.flags.lightmask
  // or canvas.lighting.objects[0]
    
});
