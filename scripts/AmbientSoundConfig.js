/* globals
foundry
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
function renderAmbientSoundConfig(app, html, data) {
  injectConfiguration(app, html, data, "SOUND"); // Async
  activateListeners(app, html);
}

PATCHES.BASIC.HOOKS = { renderAmbientSoundConfig };


// ----- NOTE: Static wraps ----- //

/**
 * Wrapper for AmbientSoundConfig.defaultOptions
 * Make the sound config window resize height automatically, to accommodate
 * different shape parameters.
 * @param {Function} wrapper
 * @return {Object} See AmbientSoundConfig.defaultOptions.
 */
function defaultOptions(wrapper) {
  const options = wrapper();
  return foundry.utils.mergeObject(options, {
    height: "auto"
  });
}

PATCHES.BASIC.STATIC_WRAPS = { defaultOptions };

// ----- NOTE: Wraps ----- //

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
  _render,
  close,
  _onChangeInput,
  getData,
  _updateObject
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

PATCHES.BASIC.METHODS = { _previewChanges, _resetPreview };
