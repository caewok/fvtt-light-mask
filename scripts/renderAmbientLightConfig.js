/* globals
canvas,
foundry,
ui,
AmbientSoundConfig,
renderTemplate
*/

'use strict';

import { MODULE_ID, CUSTOM_IDS_KEY, CUSTOM_EDGES_KEY, ORIGIN_KEY, SIDES_KEY } from "./const.js";
import { log } from "./module.js";
import { lightMaskUpdateCustomEdgeCache,
         lightMaskShiftCustomEdgeCache } from "./preUpdateAmbientLight.js";


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
    polygon: "lightmask.RegularPolygon",
    star: "lightmask.RegularStar",
    none: "lightmask.None"
  }

  const template = is_sound ?
                   `modules/${MODULE_ID}/templates/light-mask-ambient-sound-config.html` :
                   `modules/${MODULE_ID}/templates/light-mask-ambient-light-config.html`;
  const myHTML = await renderTemplate(template, data)
  log(`config rendered HTML`, myHTML);

  html.find(".form-group").last().after(myHTML);

//   const shapes = html[0].querySelector("#lightmaskshapes.lightmaskShapes");
//   const sides = html[0].querySelector("#lightmasksides");
//   console.log(`lightMaskActivateListeners shapes`, shapes);
//   console.log(`lightMaskActivateListeners sides`, sides);
//
//   shapes?.addEventListener("change", () => {
//     console.log(`Event listener for shapes: ${shapes.value}`);
//     switch (shapes.value) {
//       case "Regular Star":
//         sides.setAttribute("min", 5);
//         break;
//       default:
//         sides.setAttribute("min", 3);
//     }
//   });
}





/**
 * Wrap activateListeners to catch when user clicks the button to add custom wall ids.
 */
export function lightMaskActivateListeners(wrapped, html) {
  log(`lightMaskActivateListeners html[0] is length ${html[0].length}`, html, this);

  // this makes the config panel close but does not call _onAddWallIDs:
  // html.find('button[id="saveWallsButton"]').click(this._onAddWallIDs.bind(this));

  // this makes the config panel close but does not call _onAddWallIDs:
  //const saveWallsButton = html.find("button[id='saveWallsButton']");
  //saveWallsButton.on("click", event => this._onAddWallIDs(event, html));

  wrapped(html);
  log(`lightMaskActivateListeners after is length ${html[0].length}`, html);


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
  html.on('click', '.saveWallsButton', onAddWallIDs.bind(this));
  html.on('click', '.lightmaskRelativeCheckbox', onCheckRelative.bind(this));
  html.on('change', '#lightmaskshapes', updateShapeIndicator.bind(this));
}


/**
 * Add a method to the AmbientLightConfiguration to handle when user
 * clicks the button to add custom wall ids.
 * @param {PointerEvent} event    The originating click event
 */
function onAddWallIDs(event) {
  log(`lightMaskOnAddWallIDs`, event, this);

  const ids_to_add = controlledWallIDs();
  if(!ids_to_add) return;
  log(`Ids to add: ${ids_to_add}`);

  // somehow change the data and refresh...
//   this.document.update({ [`flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`]: ids_to_add });

  let edges_cache = this.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY) || [];
  edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, ids_to_add);
//   this.document.update({ [ `flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`]: edges_cache });


  const newData = { [`flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`]: ids_to_add,
                    [ `flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`]: edges_cache };
  const previewData = this._getSubmitData(newData);
//   log(`previewData`, previewData);
//
  foundry.utils.mergeObject(this.document.data, previewData, {inplace: true});

  this.render();
  //this._refresh();
}


function onCheckRelative(event) {
  log(`lightMaskOnCheckRelative`, event, this);

  const current_origin = { x: this.object.data.x,
                           y: this.object.data.y }
  const newData = {};
  if(event.target.checked) {
    // update with the new origin
    log(`lightMaskOnCheckRelative current origin ${current_origin.x}, ${current_origin}`);
    newData[`flags.${MODULE_ID}.${ORIGIN_KEY}`] = current_origin;

  } else {
    // set the wall locations based on the last origin because when the user unchecks
    // relative, we want the walls to stay at the last relative position (not their
    // original position)
    let edges_cache = this.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY) || [];
    const stored_origin = this.document.getFlag(MODULE_ID, ORIGIN_KEY) || current_origin;
    const delta = { dx: current_origin.x - stored_origin.x,
                    dy: current_origin.y - stored_origin.y };

    edges_cache = lightMaskShiftCustomEdgeCache(edges_cache, delta);
    newData[`flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`] = edges_cache;
  }

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(this.document.data, previewData, {inplace: true});
  this.render();
}

/**
 * If the shape selection has changed, update flags so the UI can be updated with
 * parameters specific to that shape.
 * Polygon: Sides, minimum 3.
 * Star: Points, minimum 5.
 */
function updateShapeIndicator(event) {
  log("updateShapeIndicator", event, this);
  const shape = event.target.value;
  const newData = {};
  newData[`flags.${MODULE_ID}.isCircle`] = shape === "circle" || shape === "none";
  newData[`flags.${MODULE_ID}.isPolygon`] = shape === "polygon";
  newData[`flags.${MODULE_ID}.isStar`] = shape === "star";

  const num_sides = this.document.getFlag(MODULE_ID, SIDES_KEY);
  if(shape === "polygon" && (!num_sides || num_sides < 3)) {
    newData[`flags.${MODULE_ID}.${SIDES_KEY}`] = 3;
  } else if(shape === "star" && (!num_sides || num_sides < 5)) {
    newData[`flags.${MODULE_ID}.${SIDES_KEY}`] = 5;
  }

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(this.document.data, previewData, {inplace: true});
  this.render();
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