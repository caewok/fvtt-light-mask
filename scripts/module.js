/* globals
Hooks
*/

'use strict';

export const MODULE_ID = `lightmask`;

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
  } catch (e) {}
}

Hooks.once(`init`, async function() {
  log(`Initializing...`);
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
  const moduleScope = `lightMask`;
  
  const shapeLabel = `Shape`;
  const SHAPE_KEY = "Shape"
  
  const idLabel = `Custom: Add Wall IDs`;
  const WALL_ID_KEY = `customWallIDs`
  
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
  
  const current_shape = data.data.flags?.lightMask?.Shape || "circle";
  log(`Current shape is ${current_shape}.`);
  
  const current_custom = data.data.flags?.lightMask?.customWallIDs || "";
  log(`Current custom is ${current_custom}.`);
  
  html.find(".form-group").last().after(`
  <fieldset>
    <legend>${moduleLabel}</legend>
      <div class="form-group">
        <label for="${moduleScope}.shapes">${shapeLabel}</label>
        <select id="${moduleScope}.shapes" name="flags.lightMask.Shape">
          <option value="circle" ${current_shape === "circle" ? "selected" : ""}>Circle</option>
          <option value="triangle" ${current_shape === "triangle" ? "selected" : ""}>Triangle</option>
          <option value="square" ${current_shape === "square" ? "selected" : ""}>Square</option>
          <option value="hexagon" ${current_shape === "hexagon" ? "selected" : ""}>Hexagon</option>
          <option value="custom" ${current_shape === "custom" ? "selected" : ""}>Custom</option>
        </select>  
      </div>
          
      <div class="form-group">
        <label>${idLabel}</label>
        <input name="flags.${moduleScope}.customWallIDs" type="text" data-dtype="text" value=${current_custom}>
      </div>
    </legend>
  </fieldset>
  `); 
  
  
  // to find the data, get a light.
  // l = [...canvas.lighting.sources][0]
  // l.object.data.flags.lightmask
  // or canvas.lighting.objects[0]
    
});
