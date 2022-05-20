/* globals
canvas,
foundry,
ui,
*/

"use strict";

import { log } from "./module.js";
import { MODULE_ID } from "./settings.js";
import { KEYS } from "./keys.js";
import {
  lightMaskUpdateCustomEdgeCache,
  lightMaskShiftCustomEdgeCache } from "./preUpdateAmbientLight.js";


/**
 * Wrap activateListeners to catch when user clicks the button to add custom wall ids.
 */
export function lightMaskActivateListeners(wrapped, html) {
  log(`lightMaskActivateListeners html[0] is length ${html[0].length}`, html, this);

  // This makes the config panel close but does not call _onAddWallIDs:
  // html.find('button[id="saveWallsButton"]').click(this._onAddWallIDs.bind(this));

  // This makes the config panel close but does not call _onAddWallIDs:
  // const saveWallsButton = html.find("button[id='saveWallsButton']");
  // saveWallsButton.on("click", event => this._onAddWallIDs(event, html));

  wrapped(html);
  log(`lightMaskActivateListeners after is length ${html[0].length}`, html);


  // This makes the config panel close but does not call _onAddWallIDs:
  // html.find('button[id="saveWallsButton"]').click(this._onAddWallIDs.bind(this));

  // This makes the config panel close but does not call _onAddWallIDs:
  // const saveWallsButton = html.find("button[id='saveWallsButton']");
  // saveWallsButton.on("click", event => this._onAddWallIDs(event, html));
  // saveWallsButton.on("click", event => { log(`saveWallsButton clicked!`, event) })

  // Works!
  // html.on('click', '.saveWallsButton', (event) => {
  //   log(`saveWallsButton clicked!`, event);
  // });
  html.on("click", ".saveWallsButton", onAddWallIDs.bind(this));
  html.on("click", ".lightmaskRelativeCheckbox", onCheckRelative.bind(this));
  html.on("change", "#lightmaskshapes", updateShapeIndicator.bind(this));
}


/**
 * Add a method to the AmbientLightConfiguration to handle when user
 * clicks the button to add custom wall ids.
 * @param {PointerEvent} event    The originating click event
 */
function onAddWallIDs(event) {
  log("lightMaskOnAddWallIDs", event, this);

  const ids_to_add = controlledWallIDs();
  if (!ids_to_add) return;
  log(`Ids to add: ${ids_to_add}`);

  // Change the data and refresh...
  let edges_cache = this.object.getFlag(MODULE_ID, KEYS.CUSTOM_WALLS.EDGES) || [];
  edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, ids_to_add);

  const newData = {
    [`flags.${MODULE_ID}.${KEYS.CUSTOM_WALLS.IDS}`]: ids_to_add,
    [`flags.${MODULE_ID}.${KEYS.CUSTOM_WALLS.EDGES}`]: edges_cache
  };

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(this.object.data, previewData, {inplace: true});

  this.render();
}


function onCheckRelative(event) {
  log("lightMaskOnCheckRelative", event, this);

  const current_origin = { x: this.object.data.x,
                           y: this.object.data.y }; // eslint-disable-line indent
  const newData = {};
  if (event.target.checked) {
    // Update with the new origin
    log(`lightMaskOnCheckRelative current origin ${current_origin.x}, ${current_origin}`);
    newData[`flags.${MODULE_ID}.${KEYS.ORIGIN}`] = current_origin;

  } else {
    // Set the wall locations based on the last origin because when the user unchecks
    // relative, we want the walls to stay at the last relative position (not their
    // original position)
    let edges_cache = this.object.getFlag(MODULE_ID, KEYS.CUSTOM_WALLS.EDGES) || [];
    const stored_origin = this.object.getFlag(MODULE_ID, KEYS.ORIGIN) || current_origin;
    const delta = { dx: current_origin.x - stored_origin.x,
                    dy: current_origin.y - stored_origin.y }; // eslint-disable-line indent

    edges_cache = lightMaskShiftCustomEdgeCache(edges_cache, delta);
    newData[`flags.${MODULE_ID}.${KEYS.CUSTOM_WALLS.EDGES}`] = edges_cache;
  }

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(this.object.data, previewData, {inplace: true});
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
  newData[`flags.${MODULE_ID}.isPolygon`] = shape === "polygon";
  newData[`flags.${MODULE_ID}.isStar`] = shape === "star";

  const num_sides = this.object.getFlag(MODULE_ID, KEYS.SIDES);
  if (shape === "polygon" && (!num_sides || num_sides < 3)) {
    newData[`flags.${MODULE_ID}.${KEYS.SIDES}`] = 3;
  } else if (shape === "star" && (!num_sides || num_sides < 5)) {
    newData[`flags.${MODULE_ID}.${KEYS.SIDES}`] = 5;
  }

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(this.object.data, previewData, {inplace: true});
  this.render();
}

/**
 * Retrieve a comma-separated list of wall ids currently controlled on the canvas.
 * @return {string}
 */
export function controlledWallIDs() {
  const walls = canvas.walls.controlled;
  if (walls.length === 0) {
    console.warn("Please select one or more walls on the canvas.");
    ui.notifications.warn("Please select one or more walls on the canvas.");
    return;
  }

  const id = walls.map(w => w.id);
  return id.join(",");
}
