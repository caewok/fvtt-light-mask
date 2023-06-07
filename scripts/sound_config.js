/* globals
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Allow sounds to be previewed, equivalent to the light preview approach.
// See AmbientLightConfig

/**
 * @param {Application} application     The Application instance being rendered
 * @param {jQuery} html                 The inner HTML of the document that will be displayed and may be modified
 * @param {object} data                 The object of data used when rendering the application
 */
export async function renderAmbientSoundConfigHook(application, _html, _data) {
  if ( !application.rendered && !application.closing ) {
    if ( !application.preview ) {
      const clone = application.document.object.clone();
      application.preview = clone.document;
    }
    await application.preview.object.draw();
    application.document.object.visible = false;
    application.preview.object.layer.objects.addChild(application.preview.object);
    application._previewChanges();
  }
}

/**
 * Wrapper for AmbientSoundConfig.defaultOptions
 * Make the sound config window resize height automatically, to accommodate
 * different shape parameters.
 * @param {Function} wrapper
 * @return {Object} See AmbientSoundConfig.defaultOptions.
 */
export function defaultOptionsAmbientSoundConfig(wrapper) {
  const options = wrapper();
  return foundry.utils.mergeObject(options, {
    height: "auto"
  });
}

/**
 * Wrap AmbientSoundConfig.prototype._render.
 * Store the original values for this object.
 */
export async function _renderAmbientSoundConfig(wrapper, force, options) {
  if ( !this.rendered ) this.original = this.object.toObject();
  return wrapper(force, options);
}

/**
 * Wrap AmbientSoundConfig.prototype.close
 * Reset preview if necessary.
 */
export async function closeAmbientSoundConfig(wrapper, options={}) {
  if ( !options.force ) this._resetPreview();
  return wrapper(options);
}

/**
 * Wrap AmbientSoundConfig.prototype._onChangeInput
 * Update preview data.
 */
export async function _onChangeInputAmbientSoundConfig(wrapper, event) {
  await wrapper(event);
  const previewData = this._getSubmitData();
  this._previewChanges(previewData);
}

/**
 * Preview changes to the AmbientSound document as if they were true document updates.
 * Could just copy the light version directly, but don't want to confuse anything wrapping
 * the light method.
 * @param {object} change   Data which simulates a document update
 */
export function _previewChangesAmbientSoundConfig(change) {
  if ( change ) this.preview.updateSource(change);
  this.preview.object.renderFlags.set({refresh: true});
  this.preview.object.updateSource();
}


/**
 * Restore the true data for the AmbientSound document when the form is submitted or closed
 * Could just copy the light version directly, but don't want to confuse anything wrapping
 * the light method.
 */
export function _resetPreviewAmbientSoundConfig() {
  this.preview.object.destroy({children: true});
  this.preview = null;
  this.document.object.visible = true;
  this.document.object.renderFlags.set({refresh: true});
  this.document.object.updateSource();
}

/**
 * Wrap AmbientSoundConfig.prototype._updateObject.
 * Reset the preview when updating the object
 */
export async function _updateObjectAmbientSoundConfig(wrapper, event, formData) {
  this._resetPreview();
  return wrapper(event, formData);
}
