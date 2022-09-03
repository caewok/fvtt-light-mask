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
 * If the shape rotation has changed, update flags so the UI can be updated accordingly.
 * Only relevant for AmbientSoundConfig and TokenConfig. AmbientLightConfig already
 * changes rotation.
 */
export async function updateRotation(event) {
  log("updateRotation", event, this);

  let doc = this.document;
  if ( this instanceof TokenConfig ) doc = this.token;

  const rotation = parseInt(event.target.value);
  const newData = {};
  newData[`flags.${MODULE_ID}.${KEYS.ROTATION}`] = rotation;

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(doc, previewData, {inplace: true});
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

  if ( this instanceof DefaultTokenConfig ) {
    log("Default token data update");
    doc = this.token;

  } else if ( this instanceof TokenConfig ) {
    log("Token data update");
//     doc = this.isPrototype ? this.token : this.token;
    doc = this.token;
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
      major = doc.radius;
    } else if ( this instanceof AmbientLightConfig ) {
      major = Math.max(doc.config.dim, doc.config.bright);
    } else if ( this instanceof TokenConfig ) {
      major = Math.max(doc.light.dim, doc.light.bright);
    } else {
      console.warn("updateShapeIndicator|Config object not recognized.", this);
    }

    if ( !minor || minor <= 0 || minor > major ) {
      newData[`flags.${MODULE_ID}.${KEYS.ELLIPSE.MINOR}`] = major;
    }
  }

  const previewData = this._getSubmitData(newData);
  foundry.utils.mergeObject(doc, previewData, {inplace: true});
}
