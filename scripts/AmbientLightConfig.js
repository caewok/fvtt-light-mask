/* globals
foundry,
Hooks
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, TEMPLATES, MODULE_ICON } from "./const.js";
import { injectConfiguration, activateListeners } from "./render.js";

// Patches for the AmbientSoundConfig class
export const PATCHES = {};
PATCHES.BASIC = {};

// Hook init to update the PARTS of the light config
Hooks.once("init", function() {
  foundry.applications.sheets.AmbientLightConfig.PARTS[MODULE_ID] = {
    template: TEMPLATES.LIGHT
  }
});


// ----- NOTE: Hooks ----- //

/**
 * @param {Application} application     The Application instance being rendered
 * @param {jQuery} html                 The inner HTML of the document that will be displayed and may be modified
 * @param {object} data                 The object of data used when rendering the application
 */
function renderAmbientLightConfig(app, html, data) {
  injectConfiguration(app, html, data, "LIGHT"); // Async
  activateListeners(app, html);
}

PATCHES.BASIC.HOOKS = { renderAmbientLightConfig };

// ----- NOTE: WRAPS ----- //

/**
 * Add additional module tab to the config.
 */
async function _prepareContext(wrapped, options) {
  const context = wrapped(options);
  context.tabs[MODULE_ID] =  {
    id: MODULE_ID,
    group: "sheet",
    icon: MODULE_ICON,
    label: "lightmask.AmbientConfiguration.LegendTitle" };

  // From #getTabs
  for ( const v of Object.values(context.tabs) ) {
    v.active = this.tabGroups[v.group] === v.id;
    v.cssClass = v.active ? "active" : "";
  }
  return context;
}

PATCHES.BASIC.WRAPS = { _prepareContext };

