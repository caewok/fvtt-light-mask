/* globals
CONFIG,
FormDataExtended,
foundry,
game,
getTemplate,
Hooks
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, TEMPLATES, ICONS, SHAPE } from "./const.js";
import { activateListenersV2 } from "./render.js";

// Hook init to update the PARTS of the sound config
Hooks.once("init", async function() {
  const { footer, body, ...other } = foundry.applications.sheets.AmbientSoundConfig.PARTS;

  // Just in case.
  if ( Object.hasOwn(other, "tabs") ) delete other.tabs;

  // Wrap the body template by registering it as a partial and reusing it.
  await getTemplate(body.template);
  // Handlebars.registerPartial("AmbientSoundBody", body.template);


  // Wrap the sound body template so it is displayed as a tab.
  // Ensure footer is last and the module tab is after the body.
  foundry.applications.sheets.AmbientSoundConfig.PARTS = {
    tabs: {  template: "templates/generic/tab-navigation.hbs" },
    body: { template: TEMPLATES.SOUND_BODY },
    ...other,
    [MODULE_ID]: { template: TEMPLATES.SOUND },
    footer
  }

  // Add the tab groups; Doesn't apply them to the right place for some reason...
  // foundry.applications.sheets.AmbientSoundConfig.prototype.tabGroups = { sheet: "body" };
});



// Patches for the AmbientSoundConfig class
export const PATCHES = {};
PATCHES.BASIC = {};


// ----- NOTE: Wraps ----- //

/**
 * Add additional module tab to the config.
 * Sound config currently has no tabs, so add "body" as the other.
 */
async function _prepareContext(wrapped, options) {
  const context = await wrapped(options);
  context.tabs ??= {};
  context.tabs.body = {
    id: "body",
    group: "sheet",
    icon: ICONS.SOUND,
    label: "AMBIENT_LIGHT.SECTIONS.BASIC" // Borrow the Ambient Light phrase
  }

  context.tabs[MODULE_ID] =  {
    id: MODULE_ID,
    group: "sheet",
    icon: ICONS.MODULE,
    label: "lightmask.AmbientConfiguration.LegendTitle" };

  // From AmbientLightConfig.#getTabs
  for ( const v of Object.values(context.tabs) ) {
    v.active = this.tabGroups[v.group] === v.id;
    v.cssClass = v.active ? "active" : "";
  }

  return context;
}

/**
 * Wrap to set the initial tab group for sounds.
 * Modify the provided options passed to a render request.
 * @param {RenderOptions} options                 Options which configure application rendering behavior
 * @protected
 */
function _configureRenderOptions(wrapped, options) {
  wrapped(options);
  this.tabGroups = { sheet: "body" };
}

/**
 * Add in lightmask specific data to the lightmask tab.
 * @param {string} partId                         The part being rendered
 * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
 * @param {HandlebarsRenderOptions} options       Options which configure application rendering behavior
 * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
 */
async function _preparePartContext(wrapped, partId, context, options) {
  context = await wrapped(partId, context, options);

  // Create the preview on first render.
  if ( options.isFirstRender && this.document.object ) {
    const clone = this.document.object.clone();
    this.preview = clone.document;
  }

  // Redo the document in context to point to preview.
  const document = this.preview ?? this.document;
  context.sound = document;
  context.source = document.toObject();
  context.fields = document.schema.fields;
  context.gridUnits = document.parent.grid.units || game.i18n.localize("GridUnits");
  if ( partId !== MODULE_ID ) return context;

  // Add in shapes
  context[MODULE_ID] = { shapes: SHAPE.LABELS };
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
function _attachPartListeners(wrapped, partId, htmlElement, options) {
  wrapped(partId, htmlElement, options);
  if ( partId !== MODULE_ID ) return;
  activateListenersV2(this, htmlElement);
}

// ----- Create preview as with lights ---- //

/**
 * Add AmbientSoundConfig.prototype._preRender
 * Draw the preview object.
 */
async function _preRender(wrapper, context, options) {
  await wrapper(context, options);
  if ( this.preview ) {
    await this.preview.object.draw();
    this.document.object.initializeSoundSource({deleted: true});
    this.preview.object.layer.preview.addChild(this.preview.object);
    this._previewChanges();
  }
}

/**
 * Wrap AmbientSoundConfig.prototype._onClose
 * Reset preview if necessary.
 */
function _onClose(wrapper, options) {
  if ( this.preview ) this._resetPreview();
  if ( this.document.object ) this.document.object.initializeSoundSource();
  wrapper(options);
}

/**
 * Wrap AmbientSoundConfig.prototype._onChangeForm
 * Update preview data.
 */
async function _onChangeForm(wrapper, formConfig, event) {
  await wrapper(formConfig, event);
  const formData = new FormDataExtended(this.element);
  this._previewChanges(formData.object);
}


PATCHES.BASIC.WRAPS = {
  _prepareContext,
  _preparePartContext,
  _configureRenderOptions,
  _attachPartListeners,
  _preRender
  _onClose,
  _onChangeForm
};

// ----- NOTE: Methods ----- //

// ----- Create preview as with lights ---- //



/**
 * Wrap AmbientSoundConfig.prototype_previewChanges
 * Preview changes to the AmbientSound document as if they were true document updates.
 * @param {object} change   Data which simulates a document update
 */
function _previewChanges(change) {
  if ( !this.preview ) return;
  if ( change ) this.preview.updateSource(change);
  if ( this.preview.object?.destroyed === false ) {
    this.preview.object.renderFlags.set({refresh: true});
    this.preview.object.initializeSoundSource();
  }
}

/**
 * Wrap AmbientSoundConfig.prototype._resetPreview
 * Restore the true data for the AmbientSound document when the form is submitted or closed
 */
function _resetPreview() {
  if ( !this.preview ) return;
  if ( this.preview.object?.destroyed === false ) {
    this.preview.object.destroy({children: true});
  }
  this.preview = null;
  const object = this.document.object;
  if ( object?.destroyed === false ) {
    object.renderable = true;
    object.initializeSoundSource();
    object.renderFlags.set({refresh: true});
  }
}

PATCHES.BASIC.METHODS = {
  _previewChanges,
  _resetPreview
};
