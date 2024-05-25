/* globals
foundry,
renderTemplate,
DefaultTokenConfig
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { log } from "./util.js";
import { FLAGS, MODULE_ID, TEMPLATES, HTML_INJECTION, SHAPE, CONFIG_BLOCK_IDS } from "./const.js";
import { onAddWallIDs, onCheckRelative } from "./customEdges.js";

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
  saveWallsButton.addEventListener("click", onAddWallIDs.bind(app));

  const relativeCheckbox = html.querySelector(".lightmaskRelativeCheckbox");
  relativeCheckbox.addEventListener("click", onCheckRelative.bind(app));
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
