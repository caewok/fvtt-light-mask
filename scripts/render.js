/* globals
canvas,
fromUuidSync,
ui,
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { FLAGS, MODULE_ID, SHAPE, CONFIG_BLOCK_IDS } from "./const.js";
// import {
//   lightMaskUpdateCustomEdgeCache,
//   lightMaskShiftCustomEdgeCache } from "./preUpdate.js";

export function activateListeners(app, html) {
  const shapeSelector = html.querySelector("#lightmaskshapes");
  shapeSelector.addEventListener("change", shapeChanged.bind(app));

  const saveWallsButton = html.querySelector(".saveWallsButton");
  saveWallsButton.addEventListener("click", onAddWallIDs.bind(app));

  const wallIdsTextbox = html.querySelector(".lightmaskCachedWallIDs");
  wallIdsTextbox.addEventListener("change", onAddWallIDs.bind(app));

  initializeShapeSubmenu(app, html);
}

function initializeShapeSubmenu(app, html) {
  const shape = app.preview?.flags?.[MODULE_ID]?.[FLAGS.SHAPE];
  if ( !shape ) return;

  const elems = html.getElementsByClassName(`form-group ${MODULE_ID}`);
  const shapeKey = SHAPE.INVERT_TYPES[shape];
  const shapeId = CONFIG_BLOCK_IDS[shapeKey];
  if ( !shapeId ) return;

  for ( const elem of elems ) {
    if ( elem.id === shapeId ) elem.style.display = "block";
  }
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

