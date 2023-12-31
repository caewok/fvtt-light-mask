/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { injectConfiguration, activateListeners } from "./render.js";

// Patches for the AmbientSoundConfig class
export const PATCHES = {};
PATCHES.BASIC = {};

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
