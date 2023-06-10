/* globals
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Allow sounds to be previewed, equivalent to the light preview approach.
// See AmbientLightConfig

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
  // Allow sound to be previewed.
  if ( !this.rendered && !this.closing ) {
    if ( !this.preview ) {
      const clone = this.document.object.clone();
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
 * Wrap getData to add the preview data for the sound.
 */
export function getDataSoundConfig(wrapper, options = {}) {
  const context = wrapper(options);
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
export async function _updateObjectAmbientSoundConfig(wrapper, event, formData) {
  this._resetPreview();
  return wrapper(event, formData);
}

/**
 * Add AmbientSoundDocument.prototype._onUpdate to update the preview.
 * See AmbientLightDocument.prototype._onUpdate.
 */
export function _onUpdateAmbientSoundDocument(data, options, userId) {
  Object.values(this.apps).forEach(app => {
    if ( !app.closing ) app.preview.updateSource(data, options);
  });
  this.parent._onUpdate(data, options, userId);
  Object.values(this.apps).forEach(app => {
    if ( !app.closing ) app._previewChanges(data);
  });
}
