/* globals
canvas,
foundry,
ui,
renderTemplate,
AmbientSoundConfig,
AmbientLightConfig
*/

"use strict";

import { log } from "./module.js";
import { MODULE_ID } from "./settings.js";
import { KEYS } from "./keys.js";
import {
  lightMaskUpdateCustomEdgeCache,
  lightMaskShiftCustomEdgeCache } from "./preUpdateAmbientLight.js";


/**
 * Inject new template information into the configuration render
 * See https://github.com/Varriount/fvtt-autorotate/blob/30da44c51a42e70196433ae481e3c1ebeeb80310/module/src/rotation.js#L211
 */
export async function injectAmbientLightConfiguration(app, html, data) {
  log("injectAmbientLightConfiguration", app, html, data);

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
    isEllipse: false

  };

  if ( data.data?.flags?.lightmask?.shape ) {
    const shape = data.data.flags.lightmask.shape;
    renderData.lightmask.isStar = shape === "star";
    renderData.lightmask.isPolygon = shape === "polygon";
    renderData.lightmask.isEllipse = shape === "ellipse";
  }

  foundry.utils.mergeObject(data, renderData, {inplace: true});

  const form = html.find("div[data-tab='advanced']:last");
  const snippet = await renderTemplate(
    `modules/${MODULE_ID}/templates/lightmask-ambient-light-config.html`, data);

  log("injectAmbientLightConfiguration snippet", snippet);

  form.append(snippet);
  app.setPosition(app.position);
}

/**
 * Inject new template information into the configuration render
 * See https://github.com/Varriount/fvtt-autorotate/blob/30da44c51a42e70196433ae481e3c1ebeeb80310/module/src/rotation.js#L211
 */
export async function injectAmbientSoundConfiguration(app, html, data) {
  log("injectAmbientSoundConfiguration", app, html, data);


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
    isEllipse: false
  };

  if ( data.data?.flags?.lightmask?.shape ) {
    const shape = data.data.flags.lightmask.shape;
    renderData.lightmask.isStar = shape === "star";
    renderData.lightmask.isPolygon = shape === "polygon";
    renderData.lightmask.isEllipse = shape === "ellipse";
  }

  foundry.utils.mergeObject(data, renderData, {inplace: true});

  const form = html.find(".form-group:last");
  const snippet = await renderTemplate(
    `modules/${MODULE_ID}/templates/lightmask-ambient-sound-config.html`, data);

  log("injectAmbientSoundConfiguration snippet", snippet);

  form.append(snippet);
  app.setPosition(app.position);
}

/**
 * Inject new template information into the configuration render
 * See https://github.com/Varriount/fvtt-autorotate/blob/30da44c51a42e70196433ae481e3c1ebeeb80310/module/src/rotation.js#L211
 */
export async function injectTokenLightConfiguration(app, html, data) {
  log("injectTokenLightConfiguration", app, html, data);

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
    isEllipse: false

  };

  let shape = app.isPrototype
    ? app.token?.data?.flags?.lightmask?.shape : data.object?.flags?.lightmask?.shape;

  if ( shape ) {
    log(`injectTokenLightConfiguration ${shape}`);
    renderData.lightmask.isStar = shape === "star";
    renderData.lightmask.isPolygon = shape === "polygon";
    renderData.lightmask.isEllipse = shape === "ellipse";
  }

  foundry.utils.mergeObject(data, renderData, {inplace: true});

//   let form = html.find("div[data-group='light']");
//   form = form.find("div[data-tab='advanced']:last");

  const form = html.find("div[data-group='light']:last");
  log("injectTokenLightConfiguration", form);
  const snippet = await renderTemplate(
    `modules/${MODULE_ID}/templates/lightmask-token-light-config.html`, data);

  log("injectTokenLightConfiguration data", data);
  log("injectTokenLightConfiguration snippet", snippet);

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
 * If the shape rotation has changed, update flags so the UI can be updated accordingly.
 * Only relevant for AmbientSoundConfig and TokenConfig. AmbientLightConfig already
 * changes rotation.
 */
export async function updateRotation(event) {
  log("updateRotation", event, this);

  let doc = this.document;
  let docData = this.document?.data;
  if ( this instanceof TokenConfig ) {
    doc = this.token;
    docData = this.token.data;
  }

  const rotation = parseInt(event.target.value);
  const newData = {};
  newData[`flags.${MODULE_ID}.${KEYS.ROTATION}`] = rotation;

  log(`updateRotation constructed data for ${rotation}`, newData);

  const previewData = this._getSubmitData(newData);
  log(`updateRotation preview data for ${rotation}`, previewData);
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
  if ( this instanceof TokenConfig ) {
    log("Token data update")
    doc = this.token;
    docData = this.token.data;
  }

  const shape = event.target.value;
  const newData = {};

  const num_sides = doc.getFlag(MODULE_ID, KEYS.SIDES);
  const minor = doc.getFlag(MODULE_ID, KEYS.ELLIPSE.MINOR);
  log(`${shape}; ${num_sides} sides/points; ${minor} ellipse minor`);


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

  log(`updateShapeIndicator constructed data for ${shape}`, newData);

  const previewData = this._getSubmitData(newData);
  log(`updateShapeIndicator preview data for ${shape}`, previewData);
  foundry.utils.mergeObject(docData, previewData, {inplace: true});
}

// From https://discord.com/channels/170995199584108546/811676497965613117/842458752405340200
// call before super._render
function saveScrollStates() {
  if ( this.form === null ) return;

  const html = $(this.form).parent();
  let lists = $(html.find(".save-scroll"));

  this.scrollStates = [];
  for ( let list of lists ) this.scrollStates.push($(list).scrollTop());
}



// From https://discord.com/channels/170995199584108546/811676497965613117/842458752405340200
// call after super._render
function setScrollStates() {
  if (this.scrollStates) {
    const html = $(this.form).parent();

    let lists = $(html.find(".save-scroll"));
    for ( let i = 0; i < lists.length; i++ ) $(lists[i]).scrollTop(this.scrollStates[i]);
  }
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
