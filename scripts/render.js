/* globals
FormDataExtended,
foundry,
renderTemplate,
DefaultTokenConfig
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { log, getFlag, noFlag } from "./util.js";
import { FLAGS, MODULE_ID, TEMPLATES, HTML_INJECTION, SHAPE, CONFIG_BLOCK_IDS } from "./const.js";
// import {
//   lightMaskUpdateCustomEdgeCache,
//   lightMaskShiftCustomEdgeCache } from "./preUpdate.js";

/**
 * Catch when user clicks the button to add custom wall ids, changes the shape, or clicks the checkbox.
 */
export function activateListeners(app, html) {
  html.on("change", "#lightmaskshapes", shapeChanged.bind(app));
  html.on("click", ".saveWallsButton", onAddWallIDs.bind(app));
  html.on("change", ".lightmaskCachedWallIDs", onAddWallIDs.bind(app));
}

export function activateListenersV2(app, html) {
  const shapeSelector = html.querySelector("#lightmaskshapes");
  shapeSelector.addEventListener("change", shapeChanged.bind(app));

  const saveWallsButton = html.querySelector(".saveWallsButton");
  saveWallsButton.addEventListener("click", onAddWallIDs.bind(app));

  const wallIdsTextbox = html.querySelector(".lightmaskCachedWallIDs");
  wallIdsTextbox.addEventListener("change", onAddWallIDs.bind(app));
}

function shapeChanged(event) {
  // log("shapeChanged!", event, this);
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
  // log(`injectConfiguration for ${type}`, app, html, data);

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
 * Add a method to the AmbientLightConfiguration to handle when user
 * clicks the button to add custom wall ids.
 * @param {PointerEvent} event    The originating click event
 */
function onAddWallIDs(event) {
  // log("lightMaskOnAddWallIDs", event, this);

  // Confirm the walls are valid.
  let idString;
  if ( event.target.name === "flags.lightmask.customWallIDs" ) {
    idString = cleanWallIds(event.target.value);
  } else {
    idString = controlledWallIDs();
    if (!idString) return;
  }

  // Update the form with the ids string.
  const elem = document.getElementsByClassName("lightmaskCachedWallIDs")[0];
  elem?.setAttribute("value", idString);
}

/**
 * Clean wall ids provided by a user.
 * Strip out invalid ids; change uuids to ids
 * @param {string} ids    Comma-separate string of ids or uuids, corresponding to walls
 * @returns {string} String of comma-separate ids or "" if none.
 */
function cleanWallIds(ids) {
  if ( ids === "" ) return "";
  ids = ids.split(",");
  ids = ids
    .map(id => {
      id = id.trim();
      const wall = id.includes("Scene") ? fromUuidSync(id) : canvas.walls.placeables.find(w => w.id === id);
      if ( !wall ) {
        ui.notifications.warn(`${MODULE_ID}|Wall ${id} not found.`);
        return null;
      }
      return wall.id;
    })
    .filter(id => Boolean(id));
  return ids.join(",");
}

/**
 * Retrieve a comma-separated list of wall ids currently controlled on the canvas.
 * @return {string}
 */
function controlledWallIDs() {
  const walls = canvas.walls.controlled;
  if (walls.length === 0) {
    console.warn("Please select one or more walls on the canvas.");
    ui.notifications.warn("Please select one or more walls on the canvas.");
    return;
  }

  const id = walls.map(w => w.id);
  return id.join(",");
}

