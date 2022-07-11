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
  log(`html scrollLeft: ${html.scrollTop()}; ${html[0].scrollTop}; app ${$(app.form).parent().scrollTop()}`);

  const scrollTop = app.object._sheet.form.parentElement.scrollTop;
  log(`injectAmbientLightConfiguration scrollTop before injection: ${scrollTop}`)

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
  log(`html scrollLeft: ${html.scrollTop()}; ${html[0].scrollTop}; app ${$(app.form).parent().scrollTop()}`);

  const scrollTop = app.object._sheet.form.parentElement.scrollTop;
  log(`injectAmbientSoundConfiguration scrollTop before injection: ${scrollTop}`)

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


export async function ambientLightConfigOnChangeInput(wrapper, event) {
  log("ambientLightConfigOnChangeInput", event, this);

  log(`Event target is ${event.target.id} with type ${event.target.type}`, event.target);

  if ( event.target.id === "lightmaskshapes" ) {
    log("Calling updateShapeIndicator");
    await updateShapeIndicator.call(this, event);
  }

  return wrapper(event);
}



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

//   wrapped(html);
//   log(`lightMaskActivateListeners after is length ${html[0].length}`, html);


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
//   html.on("change", "#lightmaskshapes", updateShapeIndicator.bind(this));

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
 * If the shape selection has changed, update flags so the UI can be updated with
 * parameters specific to that shape.
 * Polygon: Sides, minimum 3.
 * Star: Points, minimum 5.
 */
async function updateShapeIndicator(event) {
  log("updateShapeIndicator", event, this);

  const doc = this.document;
  const docData = this.document.data;

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

  log(`updateShapeIndicator constructed data for ${shape}`, newData);

  const previewData = this._getSubmitData(newData);
  log(`updateShapeIndicator preview data for ${shape}`, previewData);
  foundry.utils.mergeObject(docData, previewData, {inplace: true});

  // [l] = canvas.lighting.placeables
  // l.sheet.form.parentElement.scrollTop

//   this._refresh();
//   this._saveScrollPositions(this.element);
//   const html = await this.render(); // {scrollY: true} not working
//   this._restoreScrollPositions(html);

 //  const scrollTop = this.object._sheet.form.parentElement.scrollTop;
//   log(`updateShapeIndicator scrollTop before render: ${scrollTop}`, this)

   this.render();


//   const html = $(this.form).parent();
//   html[0].scrollTo(0, scrollTop);

  // const scrollToElement = document.querySelector("#lightmaskshapes");
//   const tab = scrollToElement.parentNode.parentNode.parentNode.parentElement;
//   tab.scrollTop = scrollToElement.offsetTop;


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
