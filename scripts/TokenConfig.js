/* globals
foundry,
Hooks,
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, TEMPLATES, ICONS, SHAPE } from "./const.js";
import { activateListeners } from "./render.js";

// Patches for the TokenConfig class
export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Hooks ----- //

// Hook init to update the PARTS of the token config
Hooks.once("init", function() {
  const { footer, ...other } = foundry.applications.sheets.TokenConfig.PARTS;
  foundry.applications.sheets.TokenConfig.PARTS = {
    ...other, // Includes tabs
    [MODULE_ID]: { template: TEMPLATES.LIGHT },
    footer
  }
});

Hooks.once("init", function() {
  const { footer, ...other } = foundry.applications.sheets.PrototypeTokenConfig.PARTS;
  foundry.applications.sheets.PrototypeTokenConfig.PARTS = {
    ...other, // Includes tabs
    [MODULE_ID]: { template: TEMPLATES.LIGHT },
    footer
  }
});

/**
 * Hook the light config render.
 * @param {ApplicationV2} application          The Application instance being rendered
 * @param {HTMLElement} element                The inner HTML of the document that will be displayed and may be modified
 * @param {ApplicationRenderContext} context   The application rendering context data
 * @param {ApplicationRenderOptions} options   The application rendering options
 */


function renderTokenConfig(app, element, _context, _options) {
  app.position.width = Math.max(app.position.width || 0, 600); // Make tabs long enough for the title.
  activateListeners(app, element);
}

function renderPrototypeTokenConfig(app, element, _context, _options) {
  app.position.width = Math.max(app.position.width || 0, 620); // Make tabs long enough for the title.
  activateListeners(app, element);
}

// Don't use PATCHES to avoid unnecessary duplicates.
Hooks.on("renderTokenConfig", renderTokenConfig);
Hooks.on("renderPrototypeTokenConfig", renderPrototypeTokenConfig);

// ----- NOTE: WRAPS ----- //

/**
 * Add additional module tab to the config.
 */
async function _prepareContext(wrapper, options) {
  const context = await wrapper(options);
  context.tabs[MODULE_ID] =  {
    id: MODULE_ID,
    group: "sheet",
    icon: ICONS.MODULE,
    label: "lightmask.AmbientConfiguration.LegendTitle" };

  // From #getTabs
  for ( const v of Object.values(context.tabs) ) {
    v.active = this.tabGroups[v.group] === v.id;
    v.cssClass = v.active ? "active" : "";
  }

  return context;
}

/**
 * Add in lightmask specific data to the lightmask tab.
 * @param {string} partId                         The part being rendered
 * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
 * @param {HandlebarsRenderOptions} options       Options which configure application rendering behavior
 * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
 */
async function _preparePartContext(wrapper, partId, context, options) {
  context = await wrapper(partId, context, options);
  if ( partId !== MODULE_ID ) return context;
  // Add in shapes
  context[MODULE_ID] = {
    shapes: SHAPE.LABELS
  }
  return context;
}

PATCHES.BASIC.WRAPS = {
  _prepareContext,
  _preparePartContext,
};