/* globals
foundry,
game,
canvas
*/
"use strict";

// Allow sounds to be previewed, equivalent to the light preview approach.
// See AmbientLightConfig

/**
 * Wrapper for AmbientSound.prototype._refresh
 * Because the sound can be created without drawing, need to catch this.
 */
export function _refreshAmbientSound(wrapper, options) {
  if ( !this.field ) this.draw();
  wrapper(options);
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
  this.object.updateSource(foundry.utils.mergeObject(this.original, change, {inplace: false}), {recursive: false});
  this.object._onUpdate(change, {render: false}, game.user.id);
}

/**
 * Restore the true data for the AmbientSound document when the form is submitted or closed
 * Could just copy the light version directly, but don't want to confuse anything wrapping
 * the light method.
 */
export function _resetPreviewAmbientSoundConfig() {
  this._previewChanges(this.original);

  // If the last placeable is null id, pop it b/c it was a temp for the sound refresh
  const s = canvas.sounds.placeables[canvas.sounds.placeables.length - 1];
  if ( !s.id ) canvas.sounds.placeables.pop();
}

/**
 * Wrap AmbientSoundConfig.prototype._updateObject.
 * Reset the preview when updating the object
 */
export async function _updateObjectAmbientSoundConfig(wrapper, event, formData) {
  this._resetPreview();
  return wrapper(event, formData);
}
