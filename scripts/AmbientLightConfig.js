/* globals
foundry,
Hooks
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, TEMPLATES, ICONS, SHAPE } from "./const.js";
import { activateListenersV2 } from "./render.js";

// Patches for the AmbientSoundConfig class
export const PATCHES = {};
PATCHES.BASIC = {};

// Hook init to update the PARTS of the light config
Hooks.once("init", function() {
  const { footer, ...other } = foundry.applications.sheets.AmbientLightConfig.PARTS;
  foundry.applications.sheets.AmbientLightConfig.PARTS = {
    ...other, // Includes tabs
    [MODULE_ID]: { template: TEMPLATES.LIGHT },
    footer
  }
});

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

/**
 * Monitor for shape selection changing, which changes how the value is set.
 * Attach event listeners to rendered template parts.
 * @param {string} partId                       The id of the part being rendered
 * @param {HTMLElement} htmlElement             The rendered HTML element for the part
 * @param {ApplicationRenderOptions} options    Rendering options passed to the render method
 * @protected
 */
function _attachPartListeners(wrapper, partId, htmlElement, options) {
  wrapper(partId, htmlElement, options);
  if ( partId !== MODULE_ID ) return;
  activateListenersV2(this, htmlElement);
}

/**
 * Changes to preview in the lighting config.
 * TODO: Do something here if the wall is selected?
 * @param {object} [change]  A change to preview.
 */
function _previewChanges(wrapper, change) {
  wrapper(change);
}

/**
 * Prepare data used to update the Item upon form submission.
 * TODO: Does this need an update for cached edges? Or is this captured in the hooks?
 * @param {SubmitEvent} event                   The originating form submission event
 * @param {HTMLFormElement} form                The form element that was submitted
 * @param {FormDataExtended} formData           Processed data for the submitted form
 * @returns {object}                            Prepared submission data as an object
 * @throws {Error}                              Subclasses may throw validation errors here to prevent form submission
 */
function _prepareSubmitData(wrapper, event, form, formData) {
  return wrapper(event, form, formData);
}

PATCHES.BASIC.WRAPS = {
  _prepareContext,
  _preparePartContext,
  _attachPartListeners,
  _previewChanges,
  _prepareSubmitData
};

