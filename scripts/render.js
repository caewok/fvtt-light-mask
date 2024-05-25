/* globals
foundry,
renderTemplate,
DefaultTokenConfig
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { log, getFlag, noFlag } from "./util.js";
import { FLAGS, MODULE_ID, TEMPLATES, HTML_INJECTION, SHAPE, CONFIG_BLOCK_IDS } from "./const.js";
import {
  lightMaskUpdateCustomEdgeCache,
  lightMaskShiftCustomEdgeCache } from "./preUpdate.js";
import { controlledWallIDs } from "./customEdges.js";

/**
 * Catch when user clicks the button to add custom wall ids, changes the shape, or clicks the checkbox.
 */
export function activateListeners(app, html) {
  html.on("change", "#lightmaskshapes", shapeChanged.bind(app));
  html.on("click", ".saveWallsButton", onAddWallIDs.bind(app));
  html.on("click", ".lightmaskRelativeCheckbox", onCheckRelative.bind(app));
}

export function activateListenersV2(app, html) {
  const shapeSelector = html.querySelector("#lightmaskshapes");
  shapeSelector.addEventListener("change", shapeChanged.bind(app));

  const saveWallsButton = html.querySelector(".saveWallsButton");
  saveWallsButton.addEventListener("click", onAddWallIDsV2.bind(app));

  const relativeCheckbox = html.querySelector(".lightmaskRelativeCheckbox");
  relativeCheckbox.addEventListener("click", onCheckRelativeV2.bind(app));
}

function shapeChanged(event) {
  log("shapeChanged!", event, this);
  configShapeSubmenu(event.target.value);
}

function configShapeSubmenu(shape) {
  const elemPolygon = document.getElementById(CONFIG_BLOCK_IDS.POLYGON);
  const elemStar = document.getElementById(CONFIG_BLOCK_IDS.STAR);
  const elemEllipse = document.getElementById(CONFIG_BLOCK_IDS.ELLIPSE);

  elemPolygon.style.display = "none";
  elemStar.style.display = "none";
  elemEllipse.style.display = "none";

  switch ( shape ) {
    case SHAPE.TYPES.POLYGON:
      elemPolygon.style.display = "block";
      break;
    case SHAPE.TYPES.STAR:
      elemStar.style.display = "block";
      break;
    case SHAPE.TYPES.ELLIPSE:
      elemEllipse.style.display = "block";
      break;
  }
}

/**
 * @param {string} type   See const.js for type.
 */
export async function injectConfiguration(app, html, data, type) {
  log(`injectConfiguration for ${type}`, app, html, data);

  // If default token config, make sure the default flags are set if not already.
  // Setting flags directly fails, so do manually.
  const isDefaultConfig = app.isPrototype || app instanceof DefaultTokenConfig; // PrototypeToken or DefaultToken
  if ( isDefaultConfig ) {
    data.object.flags ??= {};
    data.object.flags[MODULE_ID] ??= {};
    data.object.flags[MODULE_ID][FLAGS.SHAPE] ??= SHAPE.TYPES.CIRCLE;
    data.object.flags[MODULE_ID][FLAGS.SIDES] ??= 3;
    data.object.flags[MODULE_ID][FLAGS.POINTS] ??= 5;
    data.object.flags[MODULE_ID][FLAGS.ELLIPSE.MINOR] ??= 1;
  }

  // Do not display wall caching selectors for the token prototype or
  // default token config, because those only function at a per-scene level

  // Avoid name collisions by using "lightmask"
  const renderData = {};
  renderData.lightmask = {
    shapes: SHAPE.LABELS,
    displayCached: !isDefaultConfig
  };

  foundry.utils.mergeObject(data, renderData, {inplace: true});

  const form = html.find(HTML_INJECTION[type]);
  const snippet = await renderTemplate(TEMPLATES[type], data);

  form.append(snippet);
  app.setPosition(app.position);

  const d = type === "TOKEN" ? "object" : "data";
  const shape = data[d]?.flags?.lightmask?.shape;
  if ( shape ) configShapeSubmenu(shape);
}


/**
 * Listener to handle when a user check/unchecks the "Relative" checkbox.
 * If "Relative" is checked, the edges cache must be updated by a directional vector
 * based on the shift in origin.
 * @param {PointerEvent} event    The originating click event
 */
function onCheckRelative(event) {
  log("lightMaskOnCheckRelative", event, this);

  const current_origin = { x: this.object.x,
                           y: this.object.y };
  const newData = {};
  if (event.target.checked) {
    // Update with the new origin
    newData[`flags.${MODULE_ID}.${FLAGS.ORIGIN}`] = current_origin;

  } else {
    // Set the wall locations based on the last origin because when the user unchecks
    // relative, we want the walls to stay at the last relative position (not their
    // original position)
    let edges_cache = getFlag(this.object, FLAGS.CUSTOM_WALLS.EDGES) || [];
    const stored_origin = getFlag(this.object, FLAGS.ORIGIN) || current_origin;
    const delta = { dx: current_origin.x - stored_origin.x,
                    dy: current_origin.y - stored_origin.y };

    edges_cache = lightMaskShiftCustomEdgeCache(edges_cache, delta);
    newData[`flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.EDGES}`] = edges_cache;
  }

  const previewData = this._getSubmitData(newData);
  this._previewChanges(previewData);
  this.render();
}

function onCheckRelativeV2(event) {
  log("lightMaskOnCheckRelative", event, this);

  const current_origin = { x: this.object.x,
                           y: this.object.y };
  const newData = {};
  if (event.target.checked) {
    // Update with the new origin
    newData[`flags.${MODULE_ID}.${FLAGS.ORIGIN}`] = current_origin;

  } else {
    // Set the wall locations based on the last origin because when the user unchecks
    // relative, we want the walls to stay at the last relative position (not their
    // original position)
    let edges_cache = getFlag(this.object, FLAGS.CUSTOM_WALLS.EDGES) || [];
    const stored_origin = getFlag(this.object, FLAGS.ORIGIN) || current_origin;
    const delta = { dx: current_origin.x - stored_origin.x,
                    dy: current_origin.y - stored_origin.y };

    edges_cache = lightMaskShiftCustomEdgeCache(edges_cache, delta);
    newData[`flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.EDGES}`] = edges_cache;
  }

  const previewData = this._getSubmitData(newData);
  this._previewChanges(previewData);
  this.render();
}



/**
 * Add a method to the AmbientLightConfiguration to handle when user
 * clicks the button to add custom wall ids.
 * @param {PointerEvent} event    The originating click event
 */
function onAddWallIDs(event) {
  log("lightMaskOnAddWallIDs", event, this);

  let ids_to_add;
  if ( event.target.name === "flags.lightmask.customWallIDs" ) {
    ids_to_add = event.target.value;
  } else {
    ids_to_add = controlledWallIDs();
    if (!ids_to_add) return;
  }

  log(`Ids to add: ${ids_to_add}`);

  // Change the data and refresh...
  let edges_cache = getFlag(this.object, FLAGS.CUSTOM_WALLS.EDGES) || [];
  edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, ids_to_add);

  const newData = {
    [`flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.IDS}`]: ids_to_add,
    [`flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.EDGES}`]: edges_cache
  };

  if ( !noFlag(this.object, FLAGS.RELATIVE) ) {
    log("Relative key is true; storing origin");
    newData[`flags.${MODULE_ID}.${FLAGS.ORIGIN.EDGES}`] = { x: this.object.x, y: this.object.y };
  }

  const previewData = this._getSubmitData(newData);
  this._previewChanges(previewData);
  this.render();
}

function onAddWallIDsV2(event) {
  log("lightMaskOnAddWallIDs", event, this);

  let ids_to_add;
  if ( event.target.name === "flags.lightmask.customWallIDs" ) {
    ids_to_add = event.target.value;
  } else {
    ids_to_add = controlledWallIDs();
    if (!ids_to_add) return;
  }

  log(`Ids to add: ${ids_to_add}`);

  // Change the data and refresh...
  let edges_cache = getFlag(this.object, FLAGS.CUSTOM_WALLS.EDGES) || [];
  edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, ids_to_add);

  const newData = {
    [`flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.IDS}`]: ids_to_add,
    [`flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.EDGES}`]: edges_cache
  };

  if ( !noFlag(this.object, FLAGS.RELATIVE) ) {
    log("Relative key is true; storing origin");
    newData[`flags.${MODULE_ID}.${FLAGS.ORIGIN.EDGES}`] = { x: this.object.x, y: this.object.y };
  }

  const previewData = this._getSubmitData(newData);
  this._previewChanges(previewData);
  this.render();
}

