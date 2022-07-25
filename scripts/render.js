/* globals
canvas,
foundry,
ui,
renderTemplate,
AmbientSoundConfig,
AmbientLightConfig,
TokenConfig,
DefaultTokenConfig
*/

"use strict";

import { log } from "./module.js";
import { KEYS, MODULE_ID, TEMPLATES, HTML_INJECTION } from "./const.js";
import {
  lightMaskUpdateCustomEdgeCache,
  lightMaskShiftCustomEdgeCache } from "./preUpdate.js";


/**
 * Inject new template information into the configuration render
 * See https://github.com/Varriount/fvtt-autorotate/blob/30da44c51a42e70196433ae481e3c1ebeeb80310/module/src/rotation.js#L211
 */
export async function injectAmbientLightConfiguration(app, html, data) {
  await injectConfiguration(app, html, data, "LIGHT");
}

/**
 * Inject new template information into the configuration render
 * See https://github.com/Varriount/fvtt-autorotate/blob/30da44c51a42e70196433ae481e3c1ebeeb80310/module/src/rotation.js#L211
 */
export async function injectAmbientSoundConfiguration(app, html, data) {
  await injectConfiguration(app, html, data, "SOUND");
}

/**
 * Inject new template information into the configuration render
 * See https://github.com/Varriount/fvtt-autorotate/blob/30da44c51a42e70196433ae481e3c1ebeeb80310/module/src/rotation.js#L211
 */
export async function injectTokenLightConfiguration(app, html, data) {
  await injectConfiguration(app, html, data, "TOKEN");
}

/**
 * @param {string} type   See const.js for type.
 */
async function injectConfiguration(app, html, data, type) {
  log(`injectConfiguration for ${type}`, app, html, data);

  // Do not display wall caching selectors for the token prototype or
  // default token config, because those only function at a per-scene level
  const displayCached = !app.isPrototype && !(app instanceof DefaultTokenConfig);

  // Avoid name collisions by using "lightmask"
  const renderData = {};
  renderData.lightmask = {
    shapes: {
      circle: "lightmask.Circle",
      ellipse: "lightmask.Ellipse",
      polygon: "lightmask.RegularPolygon",
      star: "lightmask.RegularStar",
      none: "lightmask.None"
    },
    isStar: false,
    isPolygon: false,
    isEllipse: false,
    displayCached
  };

  const d = type === "TOKEN" ? "object" : "data";
  const shape = data[d]?.flags?.lightmask?.shape;
  if ( shape ) {
    log(`injectTokenLightConfiguration ${shape}`);
    renderData.lightmask.isStar = shape === "star";
    renderData.lightmask.isPolygon = shape === "polygon";
    renderData.lightmask.isEllipse = shape === "ellipse";
  }

  foundry.utils.mergeObject(data, renderData, {inplace: true});

  const form = html.find(HTML_INJECTION[type]);
  const snippet = await renderTemplate(TEMPLATES[type], data);

  form.append(snippet);
  app.setPosition(app.position);
}

/**
 * Wrap activateListeners to catch when user clicks the button to add custom wall ids.
 */
export function lightMaskActivateListeners(wrapped, html) {
  log(`lightMaskActivateListeners html[0] is length ${html[0].length}`, html, this);

  html.on("click", ".saveWallsButton", onAddWallIDs.bind(this));
  html.on("click", ".lightmaskRelativeCheckbox", onCheckRelative.bind(this));

  return wrapped(html);
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

/**
 * Listener to handle when a user check/unchecks the "Relative" checkbox.
 * If "Relative" is checked, the edges cache must be updated by a directional vector
 * based on the shift in origin.
 * @param {PointerEvent} event    The originating click event
 */
function onCheckRelative(event) {
  log("lightMaskOnCheckRelative", event, this);

  const current_origin = { x: this.object.data.x,
                           y: this.object.data.y }; // eslint-disable-line indent
  const newData = {};
  if (event.target.checked) {
    // Update with the new origin
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
 * If the shape rotation has changed, update flags so the UI can be updated accordingly.
 * Only relevant for AmbientSoundConfig and TokenConfig. AmbientLightConfig already
 * changes rotation.
 */
export async function updateRotation(event) {
  log("updateRotation", event, this);

  let docData = this.document?.data;
  if ( this instanceof TokenConfig ) docData = this.token.data;

  const rotation = parseInt(event.target.value);
  const newData = {};
  newData[`flags.${MODULE_ID}.${KEYS.ROTATION}`] = rotation;

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(docData, previewData, {inplace: true});
}

/**
 * If the shape selection has changed, update flags so the UI can be updated with
 * parameters specific to that shape.
 * Polygon: Sides, minimum 3.
 * Star: Points, minimum 5.
 */
export async function updateShapeIndicator(event) {
  log("updateShapeIndicator", event, this);

  let doc = this.document;
  let docData = this.document?.data;

  if ( this instanceof DefaultTokenConfig ) {
    log("Default token data update");
    doc = this.token;
    docData = this.data;

  } else if ( this instanceof TokenConfig ) {
    log("Token data update");
    doc = this.token;
    docData = this.isPrototype ? this.actor.data.token : this.token.data;
  }

  const shape = event.target.value;
  const newData = {};

  const num_sides = doc.getFlag(MODULE_ID, KEYS.SIDES);
  const minor = doc.getFlag(MODULE_ID, KEYS.ELLIPSE.MINOR);

  if ( shape === "polygon" && (!num_sides || num_sides < 3) ) {
    newData[`flags.${MODULE_ID}.${KEYS.SIDES}`] = 3;
  } else if ( shape === "star" && (!num_sides || num_sides < 5) ) {
    newData[`flags.${MODULE_ID}.${KEYS.SIDES}`] = 5;
  } else if ( shape === "ellipse" ) {

    let major = 0;
    if ( this instanceof AmbientSoundConfig ) {
      major = docData.radius;
    } else if ( this instanceof AmbientLightConfig ) {
      major = Math.max(docData.config.dim, docData.config.bright);
    } else if ( this instanceof TokenConfig ) {
      major = Math.max(docData.light.dim, docData.light.bright);
    } else {
      console.warn("updateShapeIndicator|Config object not recognized.", this);
    }

    if ( !minor || minor <= 0 || minor > major ) {
      newData[`flags.${MODULE_ID}.${KEYS.ELLIPSE.MINOR}`] = major;
    }
  }

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(docData, previewData, {inplace: true});
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
