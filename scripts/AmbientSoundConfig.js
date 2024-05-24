/* globals
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, TEMPLATES, ICONS, SHAPE } from "./const.js";
import { injectConfiguration, activateListeners } from "./render.js";

// Hook init to update the PARTS of the sound config
Hooks.once("init", async function() {
  const { footer, body, ...other } = foundry.applications.sheets.AmbientSoundConfig.PARTS;
  const tabs = {  template: "templates/generic/tab-navigation.hbs" };

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
  if ( partId !== MODULE_ID ) return context;
  // Add in shapes
  context[MODULE_ID] = {
    shapes: SHAPE.LABELS
  }
  return context;
}

// TODO: Keep/modify/delete?
/**
 * Wrap AmbientSoundConfig.prototype._render.
 * Store the original values for this object.
 */
async function _render(wrapper, force, options) {
  // Allow sound to be previewed.
  if ( !this.rendered && !this.closing && this.document.object ) {
    if ( !this.preview ) {
      const clone = this.document.object.clone();
      clone.document.updateSource({ radius: this.document.radius })
      this.preview = clone.document;
    }
    await this.preview.object.draw();
    this.document.object.visible = false;
    this.preview.object.layer.objects.addChild(this.preview.object);
    this._previewChanges();
  }
  return wrapper(force, options);
}

/**
 * Wrap AmbientSoundConfig.prototype.close
 * Reset preview if necessary.
 */
async function close(wrapper, options={}) {
  if ( !options.force ) this._resetPreview();
  return wrapper(options);
}

/**
 * Wrap AmbientSoundConfig.prototype._onChangeInput
 * Update preview data.
 */
async function _onChangeInput(wrapper, event) {
  await wrapper(event);
  const previewData = this._getSubmitData();
  this._previewChanges(previewData);
}

/**
 * Wrap AmbientSoundConfig.prototype.getData to add the preview data for the sound.
 */
function getData(wrapper, options = {}) {
  const context = wrapper(options);
  if ( !this.preview ) return context;
  delete context.document; // Replaced below
  return foundry.utils.mergeObject(context, {
    data: this.preview.toObject(false),
    document: this.preview
  });
}

/**
 * Wrap AmbientSoundConfig.prototype._updateObject.
 * Reset the preview when updating the object
 */
async function _updateObject(wrapper, event, formData) {
  this._resetPreview();
  return wrapper(event, formData);
}

PATCHES.BASIC.WRAPS = {
  _prepareContext,
  _preparePartContext,
  _configureRenderOptions
//   _render,
//   close,
//   _onChangeInput,
//   getData,
//   _updateObject
};

// ----- NOTE: Methods ----- //

/**
 * Wrap AmbientSoundConfig.prototype_previewChanges
 * Preview changes to the AmbientSound document as if they were true document updates.
 * Could just copy the light version directly, but don't want to confuse anything wrapping
 * the light method.
 * @param {object} change   Data which simulates a document update
 */
function _previewChanges(change) {
  if ( !this.preview ) return;
  if ( change ) this.preview.updateSource(change);
  this.preview.object.renderFlags.set({refresh: true});
  this.preview.object.updateSource();
}

/**
 * Wrap AmbientSoundConfig.prototype._resetPreview
 * Restore the true data for the AmbientSound document when the form is submitted or closed
 * Could just copy the light version directly, but don't want to confuse anything wrapping
 * the light method.
 */
function _resetPreview() {
  if ( !this.preview ) return;
  this.preview.object.destroy({children: true});
  this.preview = null;
  this.document.object.visible = true;
  this.document.object.renderFlags.set({refresh: true});
  this.document.object.updateSource();
}



PATCHES.BASIC.METHODS = {
  _previewChanges,
  _resetPreview
};
