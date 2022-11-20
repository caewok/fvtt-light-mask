/* globals
foundry,
renderTemplate,
AmbientSoundConfig,
AmbientLightConfig,
TokenConfig,
DefaultTokenConfig
*/

"use strict";

import { log, getFlag, setFlag, noFlag } from "./util.js";
import { FLAGS, MODULE_ID, TEMPLATES, HTML_INJECTION, SHAPE, CONFIG_BLOCK_IDS } from "./const.js";
import { onAddWallIDs, onCheckRelative } from "./customEdges.js";


/**
 * Wrap activateListeners to catch when user clicks the button to add custom wall ids.
 */
export function lightMaskActivateListeners(wrapped, html) {
  log(`lightMaskActivateListeners html[0] is length ${html[0].length}`, html, this);

  html.on("change", "#lightmaskshapes", shapeChanged.bind(this));
  html.on("click", ".saveWallsButton", onAddWallIDs.bind(this));
  html.on("click", ".lightmaskRelativeCheckbox", onCheckRelative.bind(this));

  return wrapped(html);
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

  // If default token config, make sure the default flags are set if not already.
  // Setting flags directly fails, so do manually.
  if ( app instanceof DefaultTokenConfig ) {
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
    displayCached: !app.isPrototype && !(app instanceof DefaultTokenConfig)
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
