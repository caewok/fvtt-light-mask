/* globals
canvas,
foundry,
ui,
AmbientSoundConfig,
renderTemplate
*/

'use strict';

import { MODULE_ID, CUSTOM_IDS_KEY, CUSTOM_EDGES_KEY, RELATIVE_KEY, ORIGIN_KEY } from "./const.js";
import { log } from "./module.js";
import { lightMaskUpdateCustomEdgeCache } from "./preUpdateAmbientLight.js";


/**
 * Inject html to add controls to the ambient light configuration:
 * 1. Drop-down to select different shapes as the radius border.
 * 2. Text box so user can add comma-separated list of wall ids to use as custom edges.
 * 3. Button so user can automatically add controlled walls as the custom edges.
 *
 * templates/scene/ambient-light-config.html
 * follows approach in https://github.com/erithtotl/wall-height/blob/master/scripts/wall-height.js
 */
export async function lightMaskRenderAmbientLightConfig(app, html, data) {
  const is_sound = Boolean(app instanceof AmbientSoundConfig);

  log(`Hooking ${is_sound ? "renderAmbientSoundConfig!" : "renderAmbientLightConfig!"}`, app, html, data);
  
  data.shapes = { 
    circle: "lightmask.Circle", 
    triangle: "lightmask.Triangle",
    square: "lightmask.Square",
    pentagon: "lightmask.Pentagon",
    pentagram: "lightmask.Pentagram",
    hexagon: "lightmask.Hexagon",
    hexagram: "lightmask.Hexagram",
    none: "lightmask.None"
  }

  const template = is_sound ? 
                   `modules/${MODULE_ID}/templates/light-mask-ambient-sound-config.html` :
                   `modules/${MODULE_ID}/templates/light-mask-ambient-light-config.html`;
  const myHTML = await renderTemplate(template, data)
 
  log(`config rendered HTML`, myHTML);
 
  html.find(".form-group").last().after(myHTML);
}

/**
 * Add a method to the AmbientLightConfiguration to handle when user 
 * clicks the button to add custom wall ids.
 * @param {PointerEvent} event    The originating click event
 */
export async function lightMaskOnAddWallIDs(event) {
  log(`lightMaskOnAddWallIDs`, event, this);
  
  const ids_to_add = controlledWallIDs();
  if(!ids_to_add) return;
  log(`Ids to add: ${ids_to_add}`);
  
  // somehow change the data and refresh...
  this.document.update({ [`flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`]: ids_to_add });
  
  let edges_cache = this.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY) || [];
  edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, ids_to_add);
  this.document.update({ [ `flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`]: edges_cache });
   
  
  // const newData = { [`flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`]: ids_to_add };
//   const previewData = this._getSubmitData(newData);
//   log(`previewData`, previewData);
//   
//   foundry.utils.mergeObject(this.document.data, previewData, {inplace: true});
  
  this.render();
  //this._refresh();
}

export async function lightMaskOnCheckRelative(event) {
  log(`lightMaskOnCheckRelative`, event, this);
  
  if(!event.target.checked) { return; } // can ignore if relative is now unchecked
  
  // cache the object origin
  const new_origin = { x: this.object.data.x, 
                       y: this.object.data.y };
  
  log(`lightMaskOnCheckRelative new origin ${new_origin.x}, ${new_origin.y}`);                     
  
  this.document.update({ [`flags.${MODULE_ID}.${ORIGIN_KEY}`]: new_origin });
  
  // const newData = { [`flags.${MODULE_ID}.${ORIGIN_KEY}`]: { x: this.object.data.x, 
//                                                             y: this.object.data.y } };
//   const previewData = this._getSubmitData(newData);
//   log(`previewData`, previewData);
//   
//   foundry.utils.mergeObject(this.document.data, previewData2, {inplace: true});
  
//   this.render();
}

/** 
 * Wrap activateListeners to catch when user clicks the button to add custom wall ids.
 */
export function lightMaskActivateListeners(wrapped, html) {
  log(`lightMaskActivateListeners`, html, this);
  
  // this makes the config panel close but does not call _onAddWallIDs:
  // html.find('button[id="saveWallsButton"]').click(this._onAddWallIDs.bind(this));
  
  // this makes the config panel close but does not call _onAddWallIDs:
  //const saveWallsButton = html.find("button[id='saveWallsButton']");
  //saveWallsButton.on("click", event => this._onAddWallIDs(event, html));
  
  wrapped(html);  
  log(`lightMaskActivateListeners after`, html);
  
  // this makes the config panel close but does not call _onAddWallIDs:
  //html.find('button[id="saveWallsButton"]').click(this._onAddWallIDs.bind(this));
  
  // this makes the config panel close but does not call _onAddWallIDs:
  //const saveWallsButton = html.find("button[id='saveWallsButton']");
  //saveWallsButton.on("click", event => this._onAddWallIDs(event, html));
  
  //saveWallsButton.on("click", event => { log(`saveWallsButton clicked!`, event) })  
  
  // works!
//   html.on('click', '.saveWallsButton', (event) => {
//     log(`saveWallsButton clicked!`, event);
//   });
   html.on('click', '.saveWallsButton', this._onAddWallIDs.bind(this));
   
   html.on('click', '.relativeCheckbox', this._onCheckRelative.bind(this));
}

/**
 * Retrieve a comma-separated list of wall ids currently controlled on the canvas.
 * @return {string}
 */
export function controlledWallIDs() {
  const walls = canvas.walls.controlled;
  if(walls.length === 0) {
    console.warn("Please select one or more walls on the canvas.");
    ui.notifications.warn("Please select one or more walls on the canvas.")
    return;
  }
  
  const id = walls.map(w => w.id);
  return id.join(",");
}