/* globals
canvas
*/

'use strict';

import { MODULE_ID, SHAPE_KEY, CUSTOM_IDS_KEY, CUSTOM_IDS_BUTTON_KEY } from "./const.js";
import { log } from "./module.js";


/**
 * Inject html to add controls to the ambient light configuration:
 * 1. Drop-down to select different shapes as the radius border.
 * 2. Text box so user can add comma-separated list of wall ids to use as custom edges.
 * 3. Button so user can automatically add controlled walls as the custom edges.
 *
 * templates/scene/ambient-light-config.html
 * follows approach in https://github.com/erithtotl/wall-height/blob/master/scripts/wall-height.js
 */
export function lightMaskRenderAmbientLightConfig(app, html, data) {
  log(`Hooking renderAmbientLightConfig!`, data);
  
  const moduleLabel = `Light Mask`;  
  const shapeLabel = `Shape`;  
  const idLabel = `Custom: Add Wall IDs`;
  const idButtonLabel = `Add selected walls`;
  
  
  // cannot get the following to work---should be possible to use 
  // handlebars {{selectOptions}} to populate the drop-down menu.
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
  
  /*
   <div class="form-group">
        <label>${idButtonLabel}</label>
        <button name="${CUSTOM_IDS_BUTTON_KEY}" type="button">${idButtonLabel}</button>
      </div>  
  
  */
  
  // to find the data, get a light.
  // l = [...canvas.lighting.sources][0]
  // l.object.data.flags.lightmask
  // or canvas.lighting.objects[0]

}

/**
 * Add a method to the AmbientLightConfiguration to handle when user 
 * clicks the button to add custom wall ids.
 * @param {PointerEvent} event    The originating click event
 */
export function lightMaskOnAddWallIDs(event) {
  log(`lightMaskOnAddWallIDs`, event);
  
  const ids_to_add = controlledWallIDs();
  if(!ids_to_add) return;
  log(`Ids to add: ${controlledWallIDs}`);
  
  // somehow change the data and refresh...
}

/** 
 * Wrap activateListeners to catch when user clicks the button to add custom wall ids.
 */
export function lightMaskActivateListeners(wrapped, html) {
  log(`lightMaskActivateListeners`);
  wrapped(html);  
  
  log(`lightMaskActivateListeners after wrap.`);

  html.find(`button["name=${CUSTOM_IDS_BUTTON_KEY}"]`)
      .click(this._onAddWallIDs.bind(this));
  
  return     
}

/**
 * Retrieve a comma-separated list of wall ids currently controlled on the canvas.
 * @return {string}
 */
export function controlledWallIDs() {
  const walls = canvas.walls.controlled;
  if(walls.length === 0) {
    console.warn("Please select one or more walls on the canvas.");
    return;
  }
  
  const id = walls.map(w => w.id);
  return id.join(",");
}